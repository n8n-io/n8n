"""Live views of a run.

COMPARE_LIVE=1 (default): compare.py serves a live page (live_server.py). COMPARE_LIVE=0 turns it off.
COMPARE_LIVE_WINDOWS=1 also opens the Instance AI thread in the browser and a terminal window for
each CLI builder. If a view cannot open, the script prints how to open it.
COMPARE_RECORD=0 skips the screen recordings that the report replays.
"""

import shlex
import shutil
import subprocess
import sys
import webbrowser

from n8n_api import setting


def is_on(name, default='1'):
	return setting(name, default=default).strip().lower() not in ('0', 'false', 'no', 'off')


def enabled():
	return is_on('COMPARE_LIVE')


def windows():
	return enabled() and is_on('COMPARE_LIVE_WINDOWS', default='0')


def recording():
	return is_on('COMPARE_RECORD')


def open_url(url):
	if not windows():
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


def open_terminal(title, command, cols=None, rows=None):
	"""Open a terminal window with a title that runs a shell command. Returns False if none opened."""
	if not windows():
		return True
	prefix = f"printf '\\033]0;%s\\007' {shlex.quote(title)}; "
	if cols and rows:
		# Resize the window so that the full screen of the CLI fits.
		prefix += f"printf '\\033[8;{rows};{cols}t'; "
	for launcher in log_window_launchers(prefix + command):
		# osascript returns at once, but xterm and other emulators run as long as the window is open.
		# A launcher that still runs after a short wait has opened its window.
		try:
			proc = subprocess.Popen(launcher, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
			                        stderr=subprocess.DEVNULL, start_new_session=True)
		except OSError:
			continue
		try:
			if proc.wait(timeout=3) == 0:
				return True
		except subprocess.TimeoutExpired:
			return True
	return False


def open_log_window(title, path):
	"""Open a terminal window that follows the log file at path."""
	quoted = shlex.quote(str(path))
	if not open_terminal(title, f'tail -n +1 -f {quoted}'):
		print(f'watch {title}: tail -f {quoted}', flush=True)
