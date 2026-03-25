# merge-descriptors

> Merge objects using their property descriptors

## Install

```sh
npm install merge-descriptors
```

## Usage

```js
import mergeDescriptors from 'merge-descriptors';

const thing = {
	get name() {
		return 'John'
	}
}

const animal = {};

mergeDescriptors(animal, thing);

console.log(animal.name);
//=> 'John'
```

## API

### merge(destination, source, overwrite?)

Merges "own" properties from a source to a destination object, including non-enumerable and accessor-defined properties. It retains original values and descriptors, ensuring the destination receives a complete and accurate copy of the source's properties.

Returns the modified destination object.

#### destination

Type: `object`

The object to receive properties.

#### source

Type: `object`

The object providing properties.

#### overwrite

Type: `boolean`\
Default: `true`

A boolean to control overwriting of existing properties.
