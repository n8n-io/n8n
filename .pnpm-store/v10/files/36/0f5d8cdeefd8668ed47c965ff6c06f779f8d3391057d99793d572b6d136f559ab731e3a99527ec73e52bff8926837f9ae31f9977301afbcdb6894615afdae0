PATH := node_modules/.bin:$(PATH)

all: package.json install

install: package.json
	yarn

test:
	mocha test/*.js

lint:
	eslint -c ./.eslint.yaml ./lib

clean:
	rm package.json yarn.lock

package.json: package.yaml
	js-yaml package.yaml > package.json

.PHONY: clean all install lint test
