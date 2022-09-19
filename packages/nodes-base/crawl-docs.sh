#!/usr/bin/env bash

# This script goes through nodes/**/*.node.json and tries to parse them
# for 'primaryDocumentation' links. If run with '--crawl', it also goes
# and checks each of the link for possible broken links.
#
# Requires 'jq' and 'curl'.

FILES=$(find ./nodes | grep '.node.json')
MISSINGS=()
INVALIDS=()
URLS=()
HTTP_404S=()

echo -n "Parsing nodes for primaryDocumentation links"

for i in $FILES; do
	if RES=$(jq -r '.resources?.primaryDocumentation?[0]?.url' <"$i" 2>/dev/null); then
		echo -n "."

		if [ "$RES" != "null" ]; then
			URLS+=("$RES")
		else
			MISSINGS+=("$i")
		fi
	else
		INVALIDS+=("$i")
	fi
done

echo

if [ ${#INVALIDS[@]} -gt 0 ]; then
	echo "The JSON for these nodes could not be parsed:"
	for i in "${INVALIDS[@]}"; do
		echo "$i"
	done
	echo
fi

if [ ${#MISSINGS[@]} -gt 0 ]; then
	echo "These nodes were missing a primaryDocumentation link:"
	for i in "${MISSINGS[@]}"; do
		echo "$i"
	done
	echo
fi

printf 'Found %s primaryDocumentation URLs.\n' ${#URLS[@]}

[ $# -eq 0 ] && echo 'Run with --crawl to do a full URL check. (This will fire a lot of HTTP requests!)'

if [ "$1" == "--crawl" ]; then
	echo "Crawling to check documentation links..."
	for i in "${URLS[@]}"; do
		echo -n "$i ￫ "
		CODE=$(curl -s -o /dev/null -w "%{http_code}" "$i")
		echo -n "$CODE "

		if [ "$CODE" == "404" ]; then
			HTTP_404S+=("$i")
			echo "❗️"
		else
			echo "✅"
		fi
		sleep 0.3
	done

	if [ ${#HTTP_404S[@]} -gt 0 ]; then
		printf '\nFound %s broken documentation URLs:\n' ${#HTTP_404S[@]}
		for i in "${HTTP_404S[@]}"; do
			echo "$i"
		done
	else
		printf '\n🎉 All documentation links seem functional. Good job!\n'
	fi
fi
