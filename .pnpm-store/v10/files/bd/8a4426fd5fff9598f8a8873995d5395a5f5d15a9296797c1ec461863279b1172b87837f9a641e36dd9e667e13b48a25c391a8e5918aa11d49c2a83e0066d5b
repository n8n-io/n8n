marked(1)		    General Commands Manual		     marked(1)

NAME
       marked - a javascript markdown parser

SYNOPSIS
       marked  [-o  <output>]  [-i  <input>] [-s <string>] [--help] [--tokens]
       [--pedantic]   [--gfm]	 [--breaks]    [--sanitize]    [--smart-lists]
       [--lang-prefix <prefix>] [--no-etc...] [--silent] [filename]


DESCRIPTION
       marked is a full-featured javascript markdown parser, built for speed.
       It also includes multiple GFM features.

EXAMPLES
       cat in.md | marked > out.html

       echo "hello *world*" | marked

       marked -o out.html -i in.md --gfm

       marked --output="hello world.html" -i in.md --no-breaks

OPTIONS
       -o, --output [output]
	      Specify file output. If none is specified, write to stdout.

       -i, --input [input]
	      Specify file input, otherwise use last argument as input file.
	      If no input file is specified, read from stdin.

       -s, --string [string]
	      Specify string input instead of a file.

       -t, --tokens
	      Output a token stream instead of html.

       --pedantic
	      Conform to obscure parts of markdown.pl as much as possible.
	      Don't fix original markdown bugs.

       --gfm  Enable github flavored markdown.

       --breaks
	      Enable GFM line breaks. Only works with the gfm option.

       --sanitize
	      Sanitize output. Ignore any HTML input.

       --smart-lists
	      Use smarter list behavior than the original markdown.

       --lang-prefix [prefix]
	      Set the prefix for code block classes.

       --mangle
	      Mangle email addresses.

       --no-sanitize, -no-etc...
	      The inverse of any of the marked options above.

       --silent
	      Silence error output.

       -h, --help
	      Display help information.

CONFIGURATION
       For configuring and running programmatically.

       Example

	   import { marked } from 'marked';
	   marked('*foo*', { gfm: true });

BUGS
       Please report any bugs to https://github.com/markedjs/marked.

LICENSE
       Copyright (c) 2011-2014, Christopher Jeffrey (MIT License).

SEE ALSO
       markdown(1), node.js(1)

								     marked(1)
