#!/usr/bin/env python3
"""Keep a built copy of master for the visual check.

  baseline.py status              JSON: the worktree, the built commit, and the commit to build
  baseline.py prepare [--no-fetch]  fetch origin/master, update the worktree, install, and build

The commit to build is the merge base of HEAD and origin/master: the master commit that this branch
starts from. Then a visual change comes from the branch, not from newer commits on master. The
build runs only when the merge base moves, for example after a rebase.

The worktree is in <FEATURE_TEST_CACHE>/master (default ~/.cache/n8n-feature-test/master). It is a
detached git worktree of this repository, so `git worktree list` shows it. The first build takes 15
to 20 minutes. The output goes to <FEATURE_TEST_CACHE>/build.log.
"""

import argparse
import fcntl
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone

from common import CACHE, git

WORKTREE = CACHE / 'master'
STATE = CACHE / 'built.json'
BUILD_LOG = CACHE / 'build.log'


def built():
	try:
		state = json.loads(STATE.read_text())
	except (OSError, ValueError):
		return None
	cli = WORKTREE / 'packages' / 'cli' / 'dist'
	editor = WORKTREE / 'packages' / 'frontend' / 'editor-ui' / 'dist' / 'index.html'
	return state if cli.exists() and editor.exists() else None


def target(fetch=False):
	"""The master commit to build: the merge base of HEAD and origin/master."""
	if fetch:
		git('fetch', '--quiet', 'origin', 'master')
	try:
		return git('merge-base', 'HEAD', 'origin/master')
	except subprocess.CalledProcessError:
		return git('rev-parse', 'origin/master')


def status():
	state = built() or {}
	try:
		commit = target()
	except subprocess.CalledProcessError:
		commit = None
	return {'worktree': str(WORKTREE), 'exists': WORKTREE.exists(), 'builtCommit': state.get('commit'),
	        'builtAt': state.get('builtAt'), 'baseCommit': commit,
	        'upToDate': bool(commit) and state.get('commit') == commit, 'log': str(BUILD_LOG)}


def run_logged(cmd, log, env=None):
	log.write(f'\n$ {" ".join(cmd)}\n')
	log.flush()
	code = subprocess.run(cmd, cwd=WORKTREE, stdout=log, stderr=subprocess.STDOUT, env=env).returncode
	if code != 0:
		raise RuntimeError(f'{" ".join(cmd)} failed with exit code {code}. See {BUILD_LOG}')


def prepare(fetch=True, say=print):
	"""Return {"root", "commit"} of a built merge base. Builds only when the merge base moved."""
	CACHE.mkdir(parents=True, exist_ok=True)
	with (CACHE / 'build.lock').open('w') as lock:
		# Two runs at the same time must not build into the same worktree.
		fcntl.flock(lock, fcntl.LOCK_EX)
		if fetch:
			say('fetch origin/master')
		commit = target(fetch)
		if not (WORKTREE / '.git').exists():
			say(f'create the master worktree in {WORKTREE}')
			git('worktree', 'add', '--detach', str(WORKTREE), commit)
		elif git('rev-parse', 'HEAD', cwd=WORKTREE) != commit:
			git('checkout', '--detach', '--force', commit, cwd=WORKTREE)
		state = built()
		if state and state.get('commit') == commit:
			say(f'master {commit[:11]} is built')
			return {'root': WORKTREE, 'commit': commit}
		started = time.time()
		say(f'build master {commit[:11]} (the merge base). The first build takes 15 to 20 minutes. Log: {BUILD_LOG}')
		with BUILD_LOG.open('w') as log:
			# DOCKER_BUILD skips the git hook install of the prepare script, so the hooks of the
			# main checkout stay as they are.
			run_logged(['pnpm', 'install', '--frozen-lockfile'], log, env={**os.environ, 'DOCKER_BUILD': 'true'})
			run_logged(['pnpm', 'turbo', 'run', 'build', '--filter=n8n...'], log)
		STATE.write_text(json.dumps({'commit': commit, 'builtAt': datetime.now(timezone.utc).isoformat()}, indent=2))
		say(f'master {commit[:11]} built in {time.time() - started:.0f}s')
		return {'root': WORKTREE, 'commit': commit}


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('action', choices=['status', 'prepare'])
	ap.add_argument('--no-fetch', action='store_true')
	args = ap.parse_args()
	if args.action == 'status':
		print(json.dumps(status(), indent=2))
		return
	try:
		result = prepare(fetch=not args.no_fetch, say=lambda m: print(m, flush=True))
	except (RuntimeError, subprocess.CalledProcessError) as e:
		sys.exit(str(e))
	print(json.dumps({'root': str(result['root']), 'commit': result['commit']}, indent=2))


if __name__ == '__main__':
	main()
