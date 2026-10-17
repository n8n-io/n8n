#!/usr/bin/env python3
"""Serve the live page of a feature test run, then its report.

  live_page.py --run-dir <run-dir> [--parent-pid <pid>] [--port <port>]

run.py starts it in the background. It uses the server of compare-workflow-builders
(live_server.py): 127.0.0.1 only, the address in <run-dir>/live-url.txt, and it stops
30 minutes after the last request when the run is done.
"""

import argparse
from pathlib import Path

import common  # noqa: F401  (puts the shared scripts on the import path)
from live_server import serve
from report import ScenarioApp


def main():
	ap = argparse.ArgumentParser()
	ap.add_argument('--run-dir', required=True)
	ap.add_argument('--parent-pid', type=int)
	ap.add_argument('--port', type=int, default=0)
	args = ap.parse_args()
	serve(ScenarioApp(Path(args.run_dir).resolve()), args.parent_pid, args.port)


if __name__ == '__main__':
	main()
