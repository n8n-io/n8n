# Variable Resolvers

The methods on the [XPathEvaluator](#) type can optionally take a variable resolver to resolve 
variable references in the XPath expression being evaluated.

There are three ways to specify a variable resolver and you can use any one of them depending on which is 
most suited to your particular situation.

Note that if your variables are in a namespace (e.g. `$myVars:var`), you must use the second or third 
type as the plain object implementation does not support namespaces.

## Variable values

You can use any of five types of values to specify the values of variables:

- string
- number
- boolean
- single node (will be treated as a node set)
- array of nodes or array-like collection of nodes (will be treated as a node set)

## Variable Resolver Type 1: Plain object

A plain object with variable names as the keys and variable values as the values.

Example usage:

````javascript
var evaluator = xpath.parse('concat($character1, ", ", $character2, ", and ", $character3)');
var mainCharacters = evaluator.evaluateString({
    variables: {
        character1: 'Harry',
        character2: 'Ron',
        character3: 'Hermione'
    }
});
````

## Variable Resolver Type 2: Function

A function that takes a variable name as its first parameter and an optional namespace URI as its second parameter 
and returns a value based on the name and namespace.

Example usage:

````javascript
var evaluator = xpath.parse('concat($hp:character1, ", ", $hp:character2, ", and ", $hp:character3)');
var mainCharacters = evaluator.evaluateString({
    variables: function (name, namespace) {
        if (namespace === 'http://sample.org/harrypotter/') {
            switch (name) {
                case 'character1': return 'Harry';
                case 'character2': return 'Ron';
                case 'character3': return 'Hermione';
            }
        }
    },
    namespaces: {
        hp: 'http://sample.org/harrypotter/'
    }
});
````

## Function Resolver Type 3: Object with `getFunction` method

An object with a method named `getVariable` that works in the same way as the function-based variable resolver 
described above.

Example usage:

````javascript
var evaluator = xpath.parse('concat($hp:character1, ", ", $hp:character2, ", and ", $hp:character3)');
var mainCharacters = evaluator.evaluateString({
    variables: {
        getVariable: function (name, namespace) {
            if (namespace === 'http://sample.org/harrypotter/') {
                switch (name) {
                    case 'character1': return 'Harry';
                    case 'character2': return 'Ron';
                    case 'character3': return 'Hermione';
                }
            }
        }
    },
    namespaces: {
        hp: 'http://sample.org/harrypotter/'
    }
});
````
