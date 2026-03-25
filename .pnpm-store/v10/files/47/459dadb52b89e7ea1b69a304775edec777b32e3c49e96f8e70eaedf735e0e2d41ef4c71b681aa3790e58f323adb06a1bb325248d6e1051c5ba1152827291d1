
{exec, spawn}   = require 'child_process'
fs              = require 'fs'
path            = require 'path'
esc             = (arg) -> (''+arg).replace(/(?=[^a-zA-Z0-9_.\/\-\x7F-\xFF\n])/gm, '\\').replace(/\n/g, "'\n'").replace(/^$/, "''")

srcDir = path.normalize __dirname+'/src'
libDir = path.normalize __dirname+'/lib'
libDebugDir = path.normalize __dirname+'/lib/debug'
distDir = path.normalize __dirname+'/dist'
cliDir = path.normalize __dirname+'/cli'
binDir = path.normalize __dirname+'/bin'
specDir = path.normalize __dirname+'/test/spec'
modulesDir = path.normalize __dirname+'/node_modules'

task 'build', 'build project', ->

    # Compile
    do compile = ->
        unless fs.existsSync libDir
            fs.mkdirSync libDir
        unless fs.existsSync libDir+'/Exception'
            fs.mkdirSync libDir+'/Exception'
        toCompile = 'Yaml Utils Unescaper Pattern Parser Inline Escaper Dumper Exception/ParseException Exception/ParseMore Exception/DumpException'.split ' '
        do compileOne = ->
            name = toCompile.shift()
            outputDir = (if '/' in name then libDir+'/Exception' else libDir)
            exec 'coffee -b -o '+esc(outputDir)+' -c '+esc(srcDir+'/'+name+'.coffee'), (err, res) ->
                if err then throw err

                console.log "Compiled #{name}.js"
                if toCompile.length
                    compileOne()
                else
                    debugCompile()

    # Debug compile
    debugCompile = ->
        unless fs.existsSync libDebugDir
            fs.mkdirSync libDebugDir
        unless fs.existsSync libDebugDir+'/Exception'
            fs.mkdirSync libDebugDir+'/Exception'
        toCompile = 'Yaml Utils Unescaper Pattern Parser Inline Escaper Dumper Exception/ParseException Exception/ParseMore Exception/DumpException'.split ' '
        do compileOne = ->
            name = toCompile.shift()
            outputDir = (if '/' in name then libDebugDir+'/Exception' else libDebugDir)
            exec 'coffee -m -b -o '+esc(outputDir)+' -c '+esc(srcDir+'/'+name+'.coffee'), (err, res) ->
                if err then throw err

                console.log "Compiled #{name}.js (debug)"
                if toCompile.length
                    compileOne()
                else
                    browserify()

    # Browserify
    unless fs.existsSync distDir
        fs.mkdirSync distDir
    browserify = ->
        exec 'browserify -t coffeeify --extension=".coffee" '+esc(srcDir+'/Yaml.coffee')+' > '+esc(distDir+'/yaml.js'), (err, res) ->
            if err then throw err

            console.log "Browserified yaml.js"
            exec 'browserify --debug -t coffeeify --extension=".coffee" '+esc(srcDir+'/Yaml.coffee')+' > '+esc(distDir+'/yaml.debug.js'), (err, res) ->
                if err then throw err

                console.log "Browserified yaml.js (debug)"
                minify()

    # Minify
    minify = ->
        exec 'uglifyjs --mangle sort '+esc(distDir+'/yaml.js')+' > '+esc(distDir+'/yaml.min.js'), (err, res) ->
            if err then throw err

            console.log "Minified yaml.min.js"
            compileSpec()

    # Compile spec
    compileSpec = ->
        exec 'coffee -b -c '+esc(specDir+'/YamlSpec.coffee'), (err, res) ->
            if err then throw err

            console.log "Compiled YamlSpec.js"
            compileCLI()

    # Compile CLI
    compileCLI = ->
        unless fs.existsSync binDir
            fs.mkdirSync binDir

        # yaml2json
        str = fs.readFileSync cliDir+'/yaml2json.js'
        str = "#!/usr/bin/env node\n" + str
        fs.writeFileSync binDir+'/yaml2json', str
        fs.chmodSync binDir+'/yaml2json', '755'
        console.log "Bundled yaml2json"

        # json2yaml
        str = fs.readFileSync cliDir+'/json2yaml.js'
        str = "#!/usr/bin/env node\n" + str
        fs.writeFileSync binDir+'/json2yaml', str
        fs.chmodSync binDir+'/json2yaml', '755'
        console.log "Bundled json2yaml"


task 'test', 'test project', ->

    # Test
    spawn 'node', [modulesDir+'/jasmine-node/lib/jasmine-node/cli.js', '--verbose', '--coffee', specDir+'/YamlSpec.coffee'], stdio: "inherit"


task 'doc', 'generate documentation', ->

    # Generate
    spawn 'codo', [srcDir], stdio: "inherit"


