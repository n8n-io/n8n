PROJECT = "samlify"

install: ;@echo "install ${PROJECT}"; \
				 npm install;

clean:	;
				rm -rf node_modules

rebuild: ;
	       rm -rf build; \
				 tsc; \

pretest:	;
					mkdir -p build/test; \
					cp -a test/key test/misc build/test;

install_jdk:
	sudo add-apt-repository ppa:openjdk-r/ppa -y
	sudo apt-get -qq update
	sudo apt-get install -y openjdk-9-jdk

doc: ;@echo "prepare and serve the docs"; \
	   docsify serve ./docs

.PHONY: rebuild pretest doc install_jdk
