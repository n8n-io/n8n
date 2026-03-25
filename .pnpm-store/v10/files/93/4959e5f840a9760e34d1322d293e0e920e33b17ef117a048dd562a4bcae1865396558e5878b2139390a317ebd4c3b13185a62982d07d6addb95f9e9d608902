.PHONY: test all

GRAMMAR=lib/grammar.pegjs
PEGJS=./node_modules/.bin/pegjs

all: lib/parser.js

lib/parser.js: $(PEGJS)
	 $(PEGJS) $(GRAMMAR) $@

$(PEGJS):
	npm install

test: lib/parser.js
	./node_modules/.bin/zUnit
