# HTTPS stub for OIDC discovery on the local stand (see ../reference.md).
# usage: oidc-discovery-stub.py <port> <cert.pem> <key.pem>
import http.server
import json
import ssl
import sys

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
cert, key = sys.argv[2], sys.argv[3]
issuer = f'https://127.0.0.1:{port}'
document = {
    'issuer': issuer,
    'authorization_endpoint': issuer + '/authorize',
    'token_endpoint': issuer + '/token',
    'userinfo_endpoint': issuer + '/userinfo',
    'jwks_uri': issuer + '/jwks',
    'end_session_endpoint': issuer + '/logout',
    'response_types_supported': ['code'],
    'subject_types_supported': ['public'],
    'id_token_signing_alg_values_supported': ['RS256'],
    'scopes_supported': ['openid', 'email', 'profile'],
    'token_endpoint_auth_methods_supported': ['client_secret_basic', 'client_secret_post'],
    'code_challenge_methods_supported': ['S256'],
}


class Handler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        payload = document if self.path.startswith('/.well-known') else {'keys': []}
        body = json.dumps(payload).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        sys.stderr.write('[oidc-stub] ' + fmt % args + '\n')


context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
context.load_cert_chain(cert, key)
server = http.server.HTTPServer(('127.0.0.1', port), Handler)
server.socket = context.wrap_socket(server.socket, server_side=True)
print(f'[oidc-stub] discovery at {issuer}/.well-known/openid-configuration', flush=True)
server.serve_forever()
