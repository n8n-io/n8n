/**
Define a [lazily evaluated](https://en.wikipedia.org/wiki/Lazy_evaluation) property on an object.

@param object - Object to add the property to.
@param propertyName - Name of the property to add.
@param valueGetter - Called the first time `propertyName` is accessed.

@example
```
import defineLazyProperty from 'define-lazy-prop';

const unicorn = {
	// …
};

defineLazyProperty(unicorn, 'rainbow', () => expensiveComputation());

app.on('user-action', () => {
	doSomething(unicorn.rainbow);
});
```
*/
export default function defineLazyProperty<
	ObjectType extends Record<string, any>,
	PropertyNameType extends string,
	PropertyValueType
>(
	object: ObjectType,
	propertyName: PropertyNameType,
	valueGetter: () => PropertyValueType
): ObjectType & {[K in PropertyNameType]: PropertyValueType};
