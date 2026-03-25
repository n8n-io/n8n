/*
Language: Julia REPL
Description: Julia REPL sessions
Author: Morten Piibeleht <morten.piibeleht@gmail.com>
Website: https://julialang.org
Requires: julia.js

The Julia REPL code blocks look something like the following:

  julia> function foo(x)
             x + 1
         end
  foo (generic function with 1 method)

They start on a new line with "julia>". Usually there should also be a space after this, but
we also allow the code to start right after the > character. The code may run over multiple
lines, but the additional lines must start with six spaces (i.e. be indented to match
"julia>"). The rest of the code is assumed to be output from the executed code and will be
left un-highlighted.

Using simply spaces to identify line continuations may get a false-positive if the output
also prints out six spaces, but such cases should be rare.
*/

function juliaRepl(hljs) {
  return {
    name: 'Julia REPL',
    contains: [
      {
        className: 'meta.prompt',
        begin: /^julia>/,
        relevance: 10,
        starts: {
          // end the highlighting if we are on a new line and the line does not have at
          // least six spaces in the beginning
          end: /^(?![ ]{6})/,
          subLanguage: 'julia'
        },
      },
    ],
    // jldoctest Markdown blocks are used in the Julia manual and package docs indicate
    // code snippets that should be verified when the documentation is built. They can be
    // either REPL-like or script-like, but are usually REPL-like and therefore we apply
    // julia-repl highlighting to them. More information can be found in Documenter's
    // manual: https://juliadocs.github.io/Documenter.jl/latest/man/doctests.html
    aliases: [ 'jldoctest' ],
  };
}

module.exports = juliaRepl;
