rm -fr dist/
mkdir dist/

if ! command -v "rexreplace" > /dev/null 2>&1; then
	echo "\nSpeed up the process by having rexreplace installed globally"
	echo "> npm install -g rexreplace"
fi

if ! command -v "esbuild" > /dev/null 2>&1; then
	echo "\nSpeed up the process by having esbuild installed globally"
	echo "> npm install -g esbuild"
fi


# Run comands via x to avoid npx overhead if the command is installed globally (3.27x slower)
x() {
	local cmd="$1"
	shift
	if command -v "$cmd" > /dev/null 2>&1; then
		"$cmd" "$@"  # Run the command with all remaining arguments
	else
		npx "$cmd" "$@"  # Use npx to run the command with all remaining arguments
	fi
}

branch=$(git rev-parse --abbrev-ref HEAD |  rexreplace '[^0-9a-z-]' '.' |  rexreplace '^[^0-9a-z]+|[^0-9a-z]+$' '')
commit=$(git rev-parse --short HEAD)


echo '\nPrepare types'
cp 'types/alasql.d.ts' dist/


echo '\nPrepare echo plugin'
cp 'src/echo/alasql-echo.js' dist/


echo '\nPrepare prolog'
cp 'src/prolog/alasql-prolog.js' dist/


echo '\nBuild alasql.js files'
outfile="dist/alasql.js"
outfile_min="dist/alasql.min.js"
outfile_fs="dist/alasql.fs.js"

echo '# Concat all parts'
cat \
	src/05copyright.js		\
	src/10start.js			\
	src/alasqlparser.js		\
	src/12pretty.js			\
	src/15utility.js		\
	src/16comments.js		\
	src/17alasql.js			\
	src/18promise.js		\
	src/20database.js		\
	src/21transaction.js	\
	src/23table.js			\
	src/24view.js			\
	src/25queryclass.js		\
	src/28yy.js				\
	src/30statements.js		\
	src/35search.js			\
	src/38query.js			\
	src/39dojoin.js			\
	src/40select.js			\
	src/41exists.js			\
	src/420from.js			\
	src/421join.js			\
	src/422where.js			\
	src/423groupby.js		\
	src/424select.js		\
	src/425having.js		\
	src/426orderby.js		\
	src/427pivot.js			\
	src/43rollup.js			\
	src/44defcols.js		\
	src/45union.js			\
	src/46apply.js			\
	src/47over.js			\
	src/50expression.js		\
	src/52linq.js			\
	src/55functions.js		\
	src/57case.js			\
	src/58json.js			\
	src/59convert.js		\
	src/60createtable.js	\
	src/61date.js			\
	src/62droptable.js		\
	src/63createvertex.js	\
	src/64altertable.js		\
	src/65createindex.js	\
	src/66dropindex.js		\
	src/67withselect.js		\
	src/68if.js				\
	src/69while.js			\
	src/70insert.js			\
	src/71trigger.js		\
	src/72delete.js			\
	src/74update.js			\
	src/75merge.js			\
	src/76usedatabase.js	\
	src/77declare.js		\
	src/78show.js			\
	src/79set.js			\
	src/80console.js		\
	src/81commit.js			\
	src/821tsql.js			\
	src/822mysql.js			\
	src/823postgres.js		\
	src/824oracle.js		\
	src/825sqlite.js		\
	src/830into.js			\
	src/831xls.js			\
	src/832xlsxml.js		\
	src/833xlsx.js			\
	src/84from.js			\
	src/843xml.js			\
	src/844gexf.js			\
	src/86print.js			\
	src/87source.js			\
	src/88require.js		\
	src/89assert.js			\
	src/91indexeddb.js		\
	src/92localstorage.js	\
	src/93sqljs.js			\
	src/94filestorage.js	\
	src/97saveas.js			\
	src/99worker.js			\
	src/FileSaver.js		\
	src/98finish.js			\
> $outfile_fs

echo '# Remove multiline comments starting with "/*/*"'
x rexreplace '/\*/\*[\S\s]+?\*/' '' -q $outfile_fs

echo '# Remove single line comments where the // part is first thing'
x rexreplace '^//[ \t]{2,}.*' '' -q $outfile_fs

echo '# Remove single line comments "console.log(" is part of the line'
x rexreplace '//.*?console\.log\(.*' '' -q $outfile_fs

echo '# Collaps multilinebreak'
x rexreplace '\n[\s]+\n' '\n\n' -q $outfile_fs

echo '# Inject package version'
x rexreplace 'PACKAGE_VERSION' 'r("package").version' -j -q $outfile_fs

echo '# Inject build version'
x rexreplace 'BUILD_VERSION' "['$branch','$commit'].filter(Boolean).join('-')" -j -q $outfile_fs

echo '# Prepare browser version'
cp $outfile_fs $outfile

echo '# Remove things not for browser build'
x rexreplace '//*not-for-browser/*' '/*not-for-browser/*'	-L -q $outfile

echo '# Reveal things only for browser build'
x rexreplace '/*only-for-browser/*' '//*only-for-browser/*'	-L -q $outfile

echo '# Support "use strict in jison output" ' # https://github.com/zaach/jison/pull/373
x rexreplace 'function locateNearestErrorRecoveryRule(state) {' 'var locateNearestErrorRecoveryRule = function (state) {'	-L -q $outfile

x esbuild --minify --outfile="$outfile_min" "$outfile" --allow-overwrite

#first_line=$(head -n 1 $outfile)
#x rexreplace '^' "c = 'first_line'; c.match(/^\/\//) ? c : ''" -j -M $outfile_min






echo '\nBuild worker files'
outfile="dist/alasql-worker.js"
outfile_min="dist/alasql-worker.js"

echo '# Concat all parts'
cat \
	src/05copyright.js		\
	src/99worker-start.js	\
	src/99worker.js			\
	src/99worker-finish.js	\
> $outfile

echo '# Inject package version'
x rexreplace 'PACKAGE_VERSION' 'r("package").version' -j -q $outfile

echo '# Inject build version'
x rexreplace 'BUILD_VERSION' "['$branch','$commit'].filter(Boolean).join('-')" -j -q $outfile

echo '# Prepare min version'
x esbuild --minify --outfile="$outfile_min" "$outfile" --allow-overwrite

#first_line=$(head -n 1 $outfile)
#x rexreplace '^' "c = 'first_line'; c.match(/^\/\//) ? c : ''" -j -M $outfile_min




