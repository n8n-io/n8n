
test: node_modules .env
	npm test

coverage: coverage/lcov.info
	node_modules/.bin/istanbul report text

coveralls: coverage/lcov.info
	cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage

.PHONY: test coverage coveralls

.env:
	@echo "BITBUCKET_CONSUMER_PUBLIC=" > $@
	@echo "BITBUCKET_CONSUMER_SECRET=" >> $@
	@echo "" >> $@
	@echo "FLICKR_CONSUMER_key=" >> $@
	@echo "FLICKR_CONSUMER_SECRET=" >> $@
	@echo "" >> $@
	@echo "LINKEDIN_CONSUMER_PUBLIC=" >> $@
	@echo "LINKEDIN_CONSUMER_SECRET=" >> $@
	@echo "" >> $@
	@echo "OPENBANK_CONSUMER_PUBLIC=" >> $@
	@echo "OPENBANK_CONSUMER_SECRET=" >> $@
	@echo "" >> $@
	@echo "TWITTER_CONSUMER_PUBLIC=" >> $@
	@echo "TWITTER_CONSUMER_SECRET=" >> $@
	@echo "TWITTER_TOKEN_PUBLIC=" >> $@
	@echo "TWITTER_TOKEN_SECRET=" >> $@

coverage/lcov.info: node_modules package.json oauth-1.0a.js .env test/*.js test/**/*.js test/mocha.opts
	node_modules/.bin/istanbul cover ./node_modules/mocha/bin/_mocha --report lcovonly

node_modules: package.json
	npm install
	touch node_modules
