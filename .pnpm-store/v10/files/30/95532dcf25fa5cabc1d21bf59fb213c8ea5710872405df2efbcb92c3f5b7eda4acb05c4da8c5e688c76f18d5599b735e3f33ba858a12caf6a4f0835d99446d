
all: dist/rbtree.min.js dist/bintree.min.js

dist/rbtree.js: lib/rbtree.js lib/treebase.js
	./node_modules/.bin/reunion --ns RBTree $< > $@

dist/bintree.js: lib/bintree.js lib/treebase.js
	./node_modules/.bin/reunion --ns BinTree $< > $@

dist/bintree.min.js: dist/bintree.js
	curl --data-urlencode "js_code@$<" \
		-d "output_info=compiled_code&compilation_level=SIMPLE_OPTIMIZATIONS" \
		http://closure-compiler.appspot.com/compile \
		> $@

dist/rbtree.min.js: dist/rbtree.js
	curl --data-urlencode "js_code@$<" \
		-d "output_info=compiled_code&compilation_level=SIMPLE_OPTIMIZATIONS" \
		http://closure-compiler.appspot.com/compile \
		> $@


