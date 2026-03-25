#!/usr/bin/env python3

# Copyright (c) 2009 Google Inc. All rights reserved.
# Use of this source code is governed by a BSD-style license that can be
# found in the LICENSE file.

from os import path

from setuptools import setup

here = path.abspath(path.dirname(__file__))
# Get the long description from the README file
with open(path.join(here, "README.md")) as in_file:
    long_description = in_file.read()

setup(
    name="gyp-next",
    version="0.10.0",
    description="A fork of the GYP build system for use in the Node.js projects",
    long_description=long_description,
    long_description_content_type="text/markdown",
    author="Node.js contributors",
    author_email="ryzokuken@disroot.org",
    url="https://github.com/nodejs/gyp-next",
    package_dir={"": "pylib"},
    packages=["gyp", "gyp.generator"],
    entry_points={"console_scripts": ["gyp=gyp:script_main"]},
    python_requires=">=3.6",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Environment :: Console",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: BSD License",
        "Natural Language :: English",
        "Programming Language :: Python",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.6",
        "Programming Language :: Python :: 3.7",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
    ],
)
