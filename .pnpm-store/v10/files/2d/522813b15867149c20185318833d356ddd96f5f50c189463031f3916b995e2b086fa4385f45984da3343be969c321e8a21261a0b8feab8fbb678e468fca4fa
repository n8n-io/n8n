Properties-Reader
=================

An ini file compatible properties reader for [Node.JS](http://nodejs.org)

See the [upgrade guide](#upgrading-v2-to-v3) for how to upgrade between major version 2 and 3.

Installation
============

The easiest installation is through [NPM](https://www.npmjs.com/package/properties-reader):

    npm install properties-reader

API
===

Read properties from a file:

    import { propertiesReader } from 'properties-reader';

    const properties = propertiesReader({ sourceFile: '/path/to/properties.file' });

The properties are then accessible either by fully qualified name, or if the property names
are in dot-delimited notation, they can be accessed as an object:

    // fully qualified name
    const property = properties.get('some.property.name');

    // lazily evaluated nested object path
    const property = properties.path().some?.property?.name;

    // flatten all properties into an object
    const obj = Object.from(properties.entries())
    const property = obj['some.property.name'];

    // flatten all properties into an object - with value parsing
    const obj = Object.from(properties.entries({ parsed: true }))
    const property = obj['some.property.name'];

    // eagerly evaluate a subset of properties into an object
    const obj = properties.getByRoot('some.property')
    const property = obj.name;

To read more than one file, chain calls to the `.append()` method:

    properties.append('/another.file').append('/yet/another.file');

To read properties from a string, use the `.read()` method:

    properties.read(`
      some.property = Value
      another.property = Another Value
    `);

To set a single property into the properties object, use `.set()`:

    properties.set('property.name', 'Property Value');

When reading a `.ini` file, sections are created by having a line that contains just a
section name in square brackets. The section name is then prefixed to all property names
that follow it until another section name is found to replace the current section.

    # contents of properties file
    [main]
    some.thing = foo

    [blah]
    something.numeric = 123

    // reading these back from the properties reader
    properties.get('main.some.thing') == 'foo';
    properties.get('blah.something.numeric') == 123;

    // iterator access for all properties - not parsed (ie: always string values)
    for (const [key, value] of properties.entries()) {
      // loops through each entry, for example:
      // key="main.some.thing", value="foo"
      // key="blah.something.numeric", value="123"
    }

    // iterator access for all properties - parsed
    for (const [key, value] of properties.entries({ parsed: true })) {
      // loops through each entry, for example:
      // key="main.some.thing", value="foo"
      // key="blah.something.numeric", value=123 <-- note, is now a number
    }

    // get subset of properties
    expect(properties.getByRoot('blah')).toEqual({
      'something.numeric': 123,
    })
    

Checking for the current number of properties that have been read into the reader:

    const propertiesCount = properties.length;

When duplicate names are found in the properties, the first one read will be replaced with
the later one.

### Saving changes

Once a file has been read and changes made, saving those changes to another
file is as simple as running:

```typescript
import { propertiesReader } from 'properties-reader';

const sourceFile = 'properties.ini'
const props = propertiesReader({ sourceFile, saveSections: true });

props.set('new.property', 'new value');

await props.save(sourceFile);
```

To output the properties without any section headings, set the
`saveSections` option to `false`.

Parsed Data Types
==========

Properties are automatically converted to their primitive data types
when using `properties.get(key)` if they represent `true`, `false` or
numeric values.

To get the original value without any parsing / type coercion applied,
use `properties.getRaw(key)`.


Upgrading V2 to V3
===============

- Import the `propertiesReader` named factory function instead of the
  package default export.

  ```
  // v2
  const propertiesReader = require('properties-reader');
  
  // v3 - default and named import
  import propertiesReader from 'properties-reader';
  import { propertiesReader } from 'properties-reader';
  
  // v3 - named property on require
  const { propertiesReader } = require('properties-reader');
  ```

- All factory arguments are now supplied in a single options object

  ```
  const options = { allowDuplicateSections, saveSections };

  // v2
  props = propertiesReader(sourceFile, encoding, options);
  
  // v3
  propertiesReader({
    sourceFile,
    encoding,
    ...options,
  });
  ```

- Custom `appender` and `writer` functions are no longer supported as
  configuration options, instead use the `props.entries()` or `props.out()`
  iterators to gain access to the data within the reader:

  ```
  // v2
  propertiesReader(sourceFile, encoding, {
    writer (reader, filePath, onComplete) { }
  })
  
  // v3
  fs.writeFile(`props.ini`, Array.from(props.out()).join('\n'), 'utf8');
  ```
  
  As the `props.out()` method returns an iterator, you can now transform the
  output as necessary, in this basic example simply joining as an array - for
  very large files this should be written to the file line by line.

- TypeScript types are now published as part of the `properties-reader` package,
  so `@type/properties-reader` can now be safely removed as a dependency.

FAQ / Breaking Changes
======================

From version `3.0.0` the following have changed:

- To improve performance when reading properties files, nested properties
  will no longer be eagerly evaluated meaning `getRaw`

- `propertiesReader(...)` now consumes a single object of options, see above
  for how to supply `sourceFile` and `encoding` options that were previously
  position based arguments.

- Custom property appender/writer functions are no longer supported,
  removes support for passing functions as `appender` or `writer`
  configuration properties.

- `props.save(destFile)` now returns a `Promise<void>` that resolves once the
  file has been written. It will no longer return the generated content to
  avoid needlessly building it in memory, to use the generated file content
  switch to using the `props.out()` function to get an iterator for the
  output file content.

- `props.save(destFile)` will now write a file that includes a trailing new line.

## Duplicate Section Headings

The `properties-reader` automatically supports sections in the properties file, merging duplicate
sections together when generating the output file contents with `props.out()` or `props.save()`.

Where duplicate sections are found in the `sourceFile` they can be kept in the output by setting
`allowDuplicateSections: true` in the `propertiesReader` factory function.

```typescript
import { propertiesReader } from 'properties-reader';

const props = propertiesReader({ sourceFile, allowDuplicateSections: true });
```

Contributions
=============

If you find bugs or want to change functionality, feel free to fork and pull request.

