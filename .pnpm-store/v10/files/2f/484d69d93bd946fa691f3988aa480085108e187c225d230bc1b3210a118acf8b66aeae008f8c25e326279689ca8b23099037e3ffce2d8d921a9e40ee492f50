TEST_TIMEOUT = 2000
TEST_REPORTER = spec

dist/difflib-browser.js: lib/difflib.js util/build.coffee
	@util/build.coffee

lib/difflib.js: src/difflib.coffee
	@coffee -c -o lib src

test:
	@NODE_ENV=test \
		node_modules/.bin/mocha \
			--ui qunit \
			--require should \
			--require coffeescript/register \
			--timeout $(TEST_TIMEOUT) \
			--reporter $(TEST_REPORTER) \
			test/*.coffee

.PHONY: test
