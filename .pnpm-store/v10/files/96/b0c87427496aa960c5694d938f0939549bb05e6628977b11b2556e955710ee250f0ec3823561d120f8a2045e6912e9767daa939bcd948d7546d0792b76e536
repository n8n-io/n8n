if grep 3155328e5 .yarn/releases/yarn-*.cjs -c; then
	echo "Your version of yarn is affected by https://github.com/yarnpkg/berry/issues/1882"
	echo "Please run \`sed -i -e \"s/3155328e5/4567890e5/g\" .yarn/releases/yarn-*.cjs\`"
	exit 1
fi
