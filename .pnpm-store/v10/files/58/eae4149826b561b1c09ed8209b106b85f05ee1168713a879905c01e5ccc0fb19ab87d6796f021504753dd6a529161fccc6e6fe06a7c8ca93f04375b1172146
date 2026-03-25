# quote-unquote

quote and unquote strings. escapes internal quotes and slashes.
Automatically decides whether to use single or double quotes.

## q = require('quote-unquote')

### q.quote (string)

`foo's bar` => `"foo's bar"`
`"foo's bar"` => `"\"foo's bar\""`
`"\"foo's bar\""` => `"\"\\\"foo's bar\\\"\""`

etc

### q.unquote(quoted_string)

the reverse of the above.

`"foo's bar"` => `foo's bar`
`"\"foo's bar\""` => `"foo's bar"`
`"\"\\\"foo's bar\\\"\""` => `"\"foo's bar\""`

## License

MIT
