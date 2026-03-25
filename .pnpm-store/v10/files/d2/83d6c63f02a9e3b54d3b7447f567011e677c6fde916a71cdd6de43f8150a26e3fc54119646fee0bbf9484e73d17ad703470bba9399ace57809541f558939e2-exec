#!/usr/bin/env bash

`ps -ef | grep -e mockserver\-.*\-jar\-with\-dependencies\.jar | grep -v JUnitStarter | grep -v grep | grep -v $0 | awk '{print $2}' | xargs -t -I '{}' kill '{}'`; echo done
