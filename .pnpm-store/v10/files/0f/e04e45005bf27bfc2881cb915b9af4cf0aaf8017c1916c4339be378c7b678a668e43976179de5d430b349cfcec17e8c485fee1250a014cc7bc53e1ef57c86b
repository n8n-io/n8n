## mjml-cli

# Installation

We recommend installing and using MJML locally, in a project folder where you'll use MJML:
```bash
npm install mjml
```
In the folder where you installed MJML you can now run:
```bash
./node_modules/.bin/mjml input.mjml
```
To avoid typing `./node_modules/.bin/`, add it to your PATH:
```bash
export PATH="$PATH:./node_modules/.bin"
```
You can now run MJML directly, in that folder:
```bash
mjml input.mjml
```

MJML is written with [NodeJS](https://nodejs.org/en/)
You can download and install the MJML engine from [NPM](https://www.npmjs.com).

# Command Line Interface

In addition to the translation engine, which converts MJML to email HTML, we've bundled a Command Line Interface (CLI) helping you to achieve the basic features it offers and integrate it seamlessly in your development flow.

### Render MJML to HTML

```bash
mjml input.mjml
```

It will output a HTML file called `input.html`.
Input can also be a directory.

### Migrate MJML3 to MJML4

```bash
$> mjml -m input.mjml -o result.mjml
```

It will output a MJML file called `result.mjml`.

### Validate MJML

```bash
$> mjml -v input.mjml
```

It will log validation errors. If there are errors, exits with code 1. Otherwise, exits with code 0.

### Render and redirect the result to stdout

```bash
mjml -s input.mjml

# or

mjml --stdout input.mjml
```

### Render and redirect the result to a file

```bash
mjml input.mjml -o my-email.html

# or

mjml input.mjml --output my-email.html
```

You can output the resulting email responsive HTML in a file.
If the output file does not exist it will be created, but output directories must already exist.
If output is a directory, output file(s) will be `output/input-file-name.html`

### Set the validation mode

```bash
mjml -l skip -r input.mjml
```

Accepted values are
- 'normal' : *(default)* will display validation messages but compile anyway
- 'skip' : the file is rendered without being validated
- 'strict' : will throw an error if validation fails

### Watch changes on a file

```bash
mjml -w input.mjml

# or

mjml --watch input.mjml
```

If you like live-coding, you might want to use the `-w` option that enables you to re-render your file every time you save it.
It can be time-saving when you can just split you screen and see the HTML output modified when you modify your MJML.

Of course, the `-w` option can be used with an `--output` option too.

### Available options

```bash
mjml input.mjml --config.optionName value

# or

mjml input.mjml -c.optionName value
```

All the options that can be passed to mjml2html (see general documentation) can be provided. The most common ones are detailed below.

### Minify and beautify the output HTML

```bash
$> mjml input.mjml --config.beautify true --config.minify false
```

These are the default options.  

### Change minify options

```bash
$> mjml input.mjml --config.minifyOptions='{"minifyCSS": true, "removeEmptyAttributes": false}'
```

The defaults are "collapseWhitespace": true, "minifyCSS": false, "removeEmptyAttributes": true  
See html-minifier documentation for more available options

### Change juice options (library used for inlining mj-style css)

```bash
$> mjml input.mjml --config.juiceOptions='{"preserveImportant": true}'
```

The defaults are "applyStyleTags": false, "insertPreservedExtraCss": false, "removeStyleTags": false  
See juice documentation for more available options  

### Preserve specific tags when using inline mj-style

```bash
$> mjml input.mjml --config.juicePreserveTags='{"myTag": { "start": "<#", "end": "</#" }}'
```

When using `<mj-style inline="inline">` the css will be inlined using the juice library. As a side effect, juice will convert all tags' attributes into lower case. If you need to preserve some cases (i.e. for a templating lib) you can specify the tags to preserve. With the example above, all tags of the form `<# myVar="" >` or `</# myVar="" >` will be left untouched. By default juice already ignores `<% EJS %>` and `{{ HBS }}` tags.

### Override base path for mj-include relative paths

```bash
$> mjml ./my-project/input.mjml --config.filePath ./my-partials/
```

If you like to keep your partials together and you want to be able to mj-include them without having to change the relative path of the includes depending on the compiled file path, you can use this option. In this exemple, `<mj-include path="./header.mjml" />` will include `./my-partials/header.mjml`, ignoring the actual path of `input.mjml`.

### Log error stack

```bash
$> mjml input.mjml --config.stack true
```
