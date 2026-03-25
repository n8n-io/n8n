TESTS = test/*.js
REPORTER = spec
TIMEOUT = 5000

test:
	@./node_modules/.bin/mocha \
		--reporter $(REPORTER) --timeout $(TIMEOUT) $(TESTS)

.PHONY: test