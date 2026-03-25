install:
	@component install

build: install
	@echo build ...
	@component build

test:
	@echo test
	@./node_modules/.bin/mocha \
		--require chai \
		--reporter spec

test-phantom: install build
	@echo test in browser
	@mocha-phantomjs test/test-runner.html

.PHONY: test build
