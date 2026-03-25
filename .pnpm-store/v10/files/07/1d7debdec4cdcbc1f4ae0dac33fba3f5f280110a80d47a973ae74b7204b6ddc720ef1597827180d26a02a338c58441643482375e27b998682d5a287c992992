yaml.js
=======

![Build status](https://travis-ci.org/jeremyfa/yaml.js.svg?branch=develop)

Standalone JavaScript YAML 1.2 Parser & Encoder. Works under node.js and all major browsers. Also brings command line YAML/JSON conversion tools.

Mainly inspired from [Symfony Yaml Component](https://github.com/symfony/Yaml).

How to use
----------

Import yaml.js in your html page:

``` html
<script type="text/javascript" src="yaml.js"></script>
```

Parse yaml string:

``` js
nativeObject = YAML.parse(yamlString);
```

Dump native object into yaml string:

``` js
yamlString = YAML.stringify(nativeObject[, inline /* @integer depth to start using inline notation at */[, spaces /* @integer number of spaces to use for indentation */] ]);
```

Load yaml file:

``` js
nativeObject = YAML.load('file.yml');
```

Load yaml file:

``` js
YAML.load('file.yml', function(result)
{
    nativeObject = result;
});
```

Use with node.js
----------------

Install module:

``` bash
npm install yamljs
```

Use it:

``` js
YAML = require('yamljs');

// parse YAML string
nativeObject = YAML.parse(yamlString);

// Generate YAML
yamlString = YAML.stringify(nativeObject, 4);

// Load yaml file using YAML.load
nativeObject = YAML.load('myfile.yml');
```

Command line tools
------------------

You can enable the command line tools by installing yamljs as a global module:

``` bash
npm install -g yamljs
```

Then, two cli commands should become available: **yaml2json** and **json2yaml**. They let you convert YAML to JSON and JSON to YAML very easily.

**yaml2json**

```
usage: yaml2json [-h] [-v] [-p] [-i INDENTATION] [-s] [-r] [-w] input

Positional arguments:
  input                 YAML file or directory containing YAML files.

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -p, --pretty          Output pretty (indented) JSON.
  -i INDENTATION, --indentation INDENTATION
                        Number of space characters used to indent code (use 
                        with --pretty, default: 2).
  -s, --save            Save output inside JSON file(s) with the same name.
  -r, --recursive       If the input is a directory, also find YAML files in 
                        sub-directories recursively.
  -w, --watch           Watch for changes.
```

**json2yaml**

```
usage: json2yaml [-h] [-v] [-d DEPTH] [-i INDENTATION] [-s] [-r] [-w] input

Positional arguments:
  input                 JSON file or directory containing JSON files.

Optional arguments:
  -h, --help            Show this help message and exit.
  -v, --version         Show program's version number and exit.
  -d DEPTH, --depth DEPTH
                        Set minimum level of depth before generating inline 
                        YAML (default: 2).
  -i INDENTATION, --indentation INDENTATION
                        Number of space characters used to indent code 
                        (default: 2).
  -s, --save            Save output inside YML file(s) with the same name.
  -r, --recursive       If the input is a directory, also find JSON files in 
                        sub-directories recursively.
  -w, --watch           Watch for changes.
```

**examples**

``` bash
# Convert YAML to JSON and output resulting JSON on the console
yaml2json myfile.yml

# Store output inside a JSON file
yaml2json myfile.yml > output.json

# Output "pretty" (indented) JSON
yaml2json myfile.yml --pretty

# Save the output inside a file called myfile.json
yaml2json myfile.yml --pretty --save

# Watch a full directory and convert any YAML file into its JSON equivalent
yaml2json mydirectory --pretty --save --recursive

# Convert JSON to YAML and store output inside a JSON file
json2yaml myfile.json > output.yml

# Output YAML that will be inlined only after 8 levels of indentation
json2yaml myfile.json --depth 8

# Save the output inside a file called myfile.json with 4 spaces for each indentation
json2yaml myfile.json --indentation 4

# Watch a full directory and convert any JSON file into its YAML equivalent
json2yaml mydirectory --pretty --save --recursive

