# Validating MJML

MJML provides a validation layer that helps you building your email. It can detect if you misplaced or mispelled a MJML component, or if you used any unauthorised attribute on a specific component. It supports 3 levels of validation:

* `skip`: your document is rendered without going through validation
* `soft`: your document is going through validation and is rendered, even if it has errors
* `strict`: your document is going through validation and is not rendered if it has any error

By default, the level is set to `soft`.

## In CLI

When using the `mjml` command line, you can add the option `-c.validationLevel` or `--config.validationLevel` with the validation level you want.

> Set the validation level to `skip` (so that the file is not validated) and render the file

```bash
mjml --config.validationLevel=skip template.mjml
```

Alternatively, you can just validate file without rendering it by add ing the `--validate` option

```bash
mjml --validate template.mjml
```

## In Javascript

In Javascript, you can provide the level through the `options` parameters on `mjml2html`. Ex: `mjml2html(inputMJML, { validationLevel: 'strict' })`

`strict` will raise a `MJMLValidationError` exception. This object has 2 methods:  
* `getErrors` returns an array of objects with `line`, `message`, `tagName` as well as a `formattedMessage` which contains the `line`, `message` and `tagName` concatenated in a sentence.  
* `getMessages` returns an array of `formattedMessage`.

When using `soft`, no exception will be raised. You can get the errors in the object returned by `mjml2html`. It is the same object returned by `getErrors` on strict mode.

