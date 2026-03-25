TEST_TIMEOUT = 2000
TEST_REPORTER = spec

lib/heap.js: src/heap.coffee
	@coffee -c -o lib src

test:
	@NODE_ENV=test \
		node_modules/.bin/mocha \
			--require should \
			--timeout $(TEST_TIMEOUT) \
			--reporter $(TEST_REPORTER) \
			--compilers coffee:coffee-script \
			test/*.coffee
			

.PHONY: test
