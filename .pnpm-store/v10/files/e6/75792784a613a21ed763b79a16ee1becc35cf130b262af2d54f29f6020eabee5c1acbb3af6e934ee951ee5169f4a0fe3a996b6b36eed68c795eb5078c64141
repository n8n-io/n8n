.PHONY: publish-patch test

test:
	npm test

patch: test
	npm version patch -m "Bump version"
	git push origin master --tags
	npm publish

minor: test
	npm version minor -m "Bump version"
	git push origin master --tags
	npm publish
