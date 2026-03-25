
SRC = lib/lunr.js \
	lib/utils.js \
	lib/field_ref.js \
	lib/set.js \
	lib/idf.js \
	lib/token.js \
	lib/tokenizer.js \
	lib/pipeline.js \
	lib/vector.js \
	lib/stemmer.js \
	lib/stop_word_filter.js \
	lib/trimmer.js \
	lib/token_set.js \
	lib/token_set_builder.js \
	lib/index.js \
	lib/builder.js \
	lib/match_data.js \
	lib/query.js \
	lib/query_parse_error.js \
	lib/query_lexer.js \
	lib/query_parser.js \

YEAR = $(shell date +%Y)
VERSION = $(shell cat VERSION)

NODE ?= $(shell which node)
NPM ?= $(shell which npm)
UGLIFYJS ?= ./node_modules/.bin/uglifyjs
MOCHA ?= ./node_modules/.bin/mocha
MUSTACHE ?= ./node_modules/.bin/mustache
ESLINT ?= ./node_modules/.bin/eslint
JSDOC ?= ./node_modules/.bin/jsdoc
NODE_STATIC ?= ./node_modules/.bin/static

all: test lint docs
release: lunr.js lunr.min.js bower.json package.json component.json docs

lunr.js: $(SRC)
	cat build/wrapper_start $^ build/wrapper_end | \
	sed "s/@YEAR/${YEAR}/" | \
	sed "s/@VERSION/${VERSION}/" > $@

lunr.min.js: lunr.js
	${UGLIFYJS} --compress --mangle --comments < $< > $@

%.json: build/%.json.template
	cat $< | sed "s/@VERSION/${VERSION}/" > $@

size: lunr.min.js
	@gzip -c lunr.min.js | wc -c

server: test/index.html
	${NODE_STATIC} -a 0.0.0.0 -H '{"Cache-Control": "no-cache, must-revalidate"}'

lint: $(SRC)
	${ESLINT} $^

perf/*_perf.js:
	${NODE} -r ./perf/perf_helper.js $@

benchmark: perf/*_perf.js

test: node_modules lunr.js
	${MOCHA} test/*.js -u tdd -r test/test_helper.js -R dot -C

test/inspect: node_modules lunr.js
	${MOCHA} test/*.js -u tdd -r test/test_helper.js -R dot -C --inspect-brk=0.0.0.0:9292

test/env/file_list.json: $(wildcard test/*test.js)
	${NODE} -p 'JSON.stringify({test_files: process.argv.slice(1)})' $^ > $@

test/index.html: test/env/file_list.json test/env/index.mustache
	${MUSTACHE} $^ > $@

docs: $(SRC)
	${JSDOC} -R README.md -d docs -c build/jsdoc.conf.json $^

clean:
	rm -f lunr{.min,}.js
	rm -rf docs
	rm *.json

reset:
	git checkout lunr.* *.json

node_modules: package.json
	${NPM} -s install

.PHONY: test clean docs reset perf/*_perf.js test/inspect
