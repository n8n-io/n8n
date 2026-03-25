Properties-Reader
=================

An ini file compatible properties reader for [Node.JS](http://nodejs.org)

Installation
============

The easiest installation is through [NPM](http://npmjs.org):

    npm install properties-reader

API
===

Read properties from a file:

    var propertiesReader = require('properties-reader');
    var properties = propertiesReader('/path/to/properties.file');

The properties are then accessible either by fully qualified name, or if the property names are in dot-delimited
notation, they can be access as an object:

    // fully qualified name
    var property = properties.get('some.property.name');

    // by object path
    var property = properties.path().some.property.name;

To read more than one file, chain calls to the `.append()` method:

    properties.append('/another.file').append('/yet/another.file');

To read properties from a string, use the `.read()` method:

    properties.read('some.property = Value \n another.property = Another Value');

To set a single property into the properties object, use `.set()`:

    properties.set('property.name', 'Property Value');

When reading a `.ini` file, sections are created by having a line that contains just a section name in square
brackets. The section name is then prefixed to all property names that follow it until another section name is found
to replace the current section.

    # contents of properties file
    [main]
    some.thing = foo

    [blah]
    some.thing = bar

    // reading these back from the properties reader
    properties.get('main.some.thing') == 'foo';
    properties.get('blah.some.thing') == 'bar';
    
    // looping through the properties reader
    properties.each((key, value) => {
      // called for each item in the reader,
      // first with key=main.some.thing, value=foo
      // next with key=blah.some.thing, value=bar
    });
    
    // get all properties at once
    expect(properties.getAllProperties()).toEqual({
      'main.some.thing': 'foo',
      'blah.some.thing': 'bar',
    })
    

Checking for the current number of properties that have been read into the reader:

    var propertiesCount = properties.length;

The length is calculated on request, so if accessing this in a loop an efficiency would be achieved by caching the
value.

When duplicate names are found in the properties, the first one read will be replaced with the later one.

To get the complete set of properties, either loop through them with the `.each((key, value) => {})` iterator or
use the convenience method `getAllProperties` to return the complete set of flattened properties. 

### Saving changes

Once a file has been read and changes made, saving those changes to another file is as simple as running:

```javascript
// async/await ES6
const propertiesReader = require('properties-reader');
const props = propertiesReader(filePath, {writer: { saveSections: true }});
await props.save(filePath);

// ES5 callback styles
props.save(filePath, function then(err, data) { ... });

// ES5 promise style
props.save(filePath).then(onSaved, onSaveError);
```

To output the properties without any section headings, set the `saveSections` option to `false`

Data Types
==========

Properties will automatically be converted to their regular data types when they represent true/false or numeric
values. To get the original value without any parsing / type coercion applied, use `properties.getRaw('path.to.prop')`.

FAQ / Breaking Changes
======================

## Duplicate Section Headings

From version `2.0.0` the default behaviour relating to multiple `[section]` blocks with the same name has changed
so combine the items of each same-named section into the one section. This is only visible when saving the items
(via `reader.save()`).

To restore the previous behaviour which would allow duplicate `[...]` blocks to be created, supply an appender
configuration with the property `allowDuplicateSections` set to `true`.

```javascript
const propertiesReader = require('properties-reader');
const props = propertiesReader(filePath, 'utf-8', { allowDuplicateSections: true });
```

Contributions
=============

If you find bugs or want to change functionality, feel free to fork and pull request.

