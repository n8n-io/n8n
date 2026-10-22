"""Record the request bodies that a CLI sends to its model API. Standard library only.

The recorder is a local HTTP proxy. The CLI sends its model requests to the recorder, and the
recorder sends them to the real API without changes. It writes the request bodies to a JSONL file.
It never writes headers, so the API key stays out of the file.

Each row has the request settings without the conversation input. The tools and the instructions
are in a row only when they differ from the previous request of the same thread, because the CLI
sends them every turn.
The tools field also holds the tools of additional_tools input items.
"""

import gzip
import http.client
import json
import threading
import time
import zlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

# Headers that apply to one connection only. The recorder sets its own values.
HOP_HEADERS = {'connection', 'keep-alive', 'proxy-connection', 'proxy-authorization', 'te', 'trailer',
               'transfer-encoding', 'upgrade', 'host', 'content-length', 'accept-encoding'}
CHANGING_KEYS = ('tools', 'instructions')


def decode_body(data, encoding):
	encoding = (encoding or '').lower()
	if encoding == 'gzip':
		return gzip.decompress(data)
	if encoding == 'deflate':
		return zlib.decompress(data)
	if encoding == 'zstd':
		from compression import zstd
		return zstd.decompress(data)
	return data


class RequestRecorder:
	"""Start with start(). Point the CLI at base_url(host). Call stop() when the CLI is done."""

	def __init__(self, upstream, out_file, bind='127.0.0.1'):
		self.upstream = urlparse(upstream)
		self.out_file = out_file
		self.lock = threading.Lock()
		self.idle = threading.Condition(self.lock)
		self.active = 0
		self.last = {}
		self.count = 0
		self.started = time.time()
		self.server = ThreadingHTTPServer((bind, 0), self.handler())
		self.server.daemon_threads = True
		self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)

	@property
	def port(self):
		return self.server.server_address[1]

	def base_url(self, host):
		return f'http://{host}:{self.port}{self.upstream.path.rstrip("/")}'

	def start(self):
		self.out_file.parent.mkdir(parents=True, exist_ok=True)
		self.out_file.write_text('')
		self.thread.start()
		return self

	def stop(self, timeout=30):
		"""Stop the server. Wait until the open requests are written, so count is final."""
		self.server.shutdown()
		with self.idle:
			self.idle.wait_for(lambda: self.active == 0, timeout=timeout)
		self.server.server_close()

	def begin(self):
		with self.lock:
			self.active += 1

	def end(self):
		with self.idle:
			self.active -= 1
			self.idle.notify_all()

	def record(self, method, path, body, encoding, status, error_text):
		row = {'t': round(time.time() - self.started, 3), 'method': method, 'path': path, 'status': status}
		try:
			payload = json.loads(decode_body(body, encoding)) if body else None
		except (ValueError, OSError, ImportError):
			payload, row['bodyBytes'] = None, len(body)
		with self.lock:
			if isinstance(payload, dict):
				items = payload.get('input') if isinstance(payload.get('input'), list) else []
				if items:
					row['inputItems'] = len(items)
				# Codex sends its tools as an additional_tools input item, not in the top-level tools field.
				extra = [t for i in items if isinstance(i, dict) and i.get('type') == 'additional_tools'
				         for t in i.get('tools') or []]
				if extra:
					payload = {**payload, 'tools': (payload.get('tools') or []) + extra}
				# Side tasks, such as a title request, run on their own thread with other tools.
				metadata = payload.get('client_metadata') if isinstance(payload.get('client_metadata'), dict) else {}
				thread = metadata.get('thread_id') or payload.get('prompt_cache_key') or ''
				for key, value in payload.items():
					if key == 'input':
						continue
					if key in CHANGING_KEYS:
						if self.last.get((thread, key)) == value:
							continue
						self.last[(thread, key)] = value
					row[key] = value
			if error_text:
				row['error'] = error_text
			self.count += 1
			with self.out_file.open('a') as f:
				f.write(json.dumps(row, ensure_ascii=False) + '\n')

	def handler(self):
		recorder = self

		class Handler(BaseHTTPRequestHandler):
			protocol_version = 'HTTP/1.1'

			def log_message(self, *args):
				pass

			def read_body(self):
				if self.headers.get('Content-Length'):
					return self.rfile.read(int(self.headers['Content-Length']))
				if 'chunked' not in (self.headers.get('Transfer-Encoding') or '').lower():
					return b''
				parts = []
				while True:
					size = int(self.rfile.readline().split(b';')[0].strip() or b'0', 16)
					if not size:
						self.rfile.readline()
						return b''.join(parts)
					parts.append(self.rfile.read(size))
					self.rfile.readline()

			def forward(self):
				recorder.begin()
				try:
					self.forward_and_record()
				finally:
					recorder.end()

			def forward_and_record(self):
				body = self.read_body()
				up = recorder.upstream
				conn_class = http.client.HTTPSConnection if up.scheme == 'https' else http.client.HTTPConnection
				conn = conn_class(up.hostname, up.port, timeout=900)
				headers = {k: v for k, v in self.headers.items() if k.lower() not in HOP_HEADERS}
				headers['Host'] = up.netloc
				headers['Content-Length'] = str(len(body))
				status, error_text, replied = 502, None, False
				try:
					conn.request(self.command, self.path, body=body, headers=headers)
					resp = conn.getresponse()
					status, replied = resp.status, True
					self.send_response(resp.status, resp.reason)
					for key, value in resp.getheaders():
						if key.lower() not in HOP_HEADERS:
							self.send_header(key, value)
					self.send_header('Transfer-Encoding', 'chunked')
					self.end_headers()
					kept = b''
					while chunk := resp.read1(65536):
						if status >= 400 and len(kept) < 4000:
							kept += chunk
						self.wfile.write(b'%x\r\n%s\r\n' % (len(chunk), chunk))
						self.wfile.flush()
					self.wfile.write(b'0\r\n\r\n')
					self.wfile.flush()
					if kept:
						error_text = kept[:4000].decode('utf-8', 'replace')
				except (OSError, http.client.HTTPException) as e:
					error_text = f'recorder: {type(e).__name__}'
					if not replied:
						try:
							self.send_error(502, 'Recorder could not reach the API')
						except OSError:
							pass
					self.close_connection = True
				finally:
					conn.close()
					recorder.record(self.command, self.path, body, self.headers.get('Content-Encoding'),
					                status, error_text)

			do_GET = do_POST = do_PUT = do_DELETE = do_PATCH = forward

		return Handler
