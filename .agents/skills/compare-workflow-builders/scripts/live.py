"""Live views of a run: a browser tab for Instance AI and a terminal window for each CLI builder.

Set COMPARE_LIVE=0 to turn them off. If a view cannot open, the script prints how to open it.
"""

import shlex
import shutil
import subprocess
import sys
import webbrowser

from n8n_api import setting


def enabled():
	return setting('COMPARE_LIVE', default='1').strip().lower() not in ('0', 'false', 'no', 'off')


def open_url(url):
	if not enabled():
		return
	try:
		opened = webbrowser.open(url)
	except webbrowser.Error:
		opened = False
	if not opened:
		print(f'open {url} to watch the run', flush=True)


def log_window_launchers(command):
	if sys.platform == 'darwin' and shutil.which('osascript'):
		# The command goes in as an argument, so it needs no AppleScript quoting.
		yield ['osascript', '-e', 'on run argv', '-e',
		       'tell application "Terminal" to do script (item 1 of argv)', '-e', 'end run', command]
	for terminal, flag in (('x-terminal-emulator', '-e'), ('gnome-terminal', '--'), ('konsole', '-e'), ('xterm', '-e')):
		if shutil.which(terminal):
			yield [terminal, flag, 'sh', '-c', command]
			return


def open_log_window(title, path):
	"""Open a terminal window that follows the log file at path."""
	if not enabled():
		return
	quoted = shlex.quote(str(path))
	command = f"printf '\\033]0;%s\\007' {shlex.quote(title)}; tail -n +1 -f {quoted}"
	for launcher in log_window_launchers(command):
		try:
			if subprocess.run(launcher, capture_output=True, timeout=15).returncode == 0:
				return
		except (OSError, subprocess.TimeoutExpired):
			continue
	print(f'watch {title}: tail -f {quoted}', flush=True)
