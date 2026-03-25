RABBITMQ_SRC_VERSION=v3.12.13
JSON=amqp-rabbitmq-0.9.1.json
AMQP_JSON=https://raw.githubusercontent.com/rabbitmq/rabbitmq-server/$(RABBITMQ_SRC_VERSION)/deps/rabbitmq_codegen/$(JSON)

NODEJS_VERSIONS='10.21' '11.15' '12.18' '13.14' '14.5' '15.8' '16.3.0' '18.1.0' '20.10.0'

MOCHA=./node_modules/.bin/mocha
_MOCHA=./node_modules/.bin/_mocha
UGLIFY=./node_modules/.bin/uglifyjs
NYC=./node_modules/.bin/nyc

.PHONY: test test-all-nodejs coverage lib/defs.js

error:
	@echo "Please choose one of the following targets: test, test-all-nodejs, coverage, lib/defs.js"
	@exit 1

test:
	$(MOCHA) --check-leaks -u tdd --exit test/

test-all-nodejs:
	for v in $(NODEJS_VERSIONS); \
		do echo "-- Node version $$v --"; \
		nave use $$v $(MOCHA) -u tdd --exit -R progress test; \
		done

coverage: $(NYC)
	$(NYC) --clean --reporter=lcov --reporter=text $(_MOCHA) -u tdd --exit -R progress test/
	@echo "HTML report at file://$$(pwd)/coverage/lcov-report/index.html"

lib/defs.js: clean bin/generate-defs test

clean:
	rm -f lib/defs.js bin/amqp-rabbitmq-0.9.1.json

bin/generate-defs: $(UGLIFY) bin/generate-defs.js bin/amqp-rabbitmq-0.9.1.json
	(cd bin; node ./generate-defs.js > ../lib/defs.js)
	$(UGLIFY) ./lib/defs.js -o ./lib/defs.js \
		-c 'sequences=false' --comments \
		-b 'indent-level=2' 2>&1 | (grep -v 'WARN' || true)

bin/amqp-rabbitmq-0.9.1.json:
	curl -L $(AMQP_JSON) > $@

$(ISTANBUL):
	npm install

$(UGLIFY):
	npm install
