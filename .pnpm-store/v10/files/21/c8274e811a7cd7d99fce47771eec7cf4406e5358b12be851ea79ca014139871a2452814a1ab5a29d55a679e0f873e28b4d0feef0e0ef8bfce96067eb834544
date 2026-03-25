# duck.js -- rich matchers with helpful messages on match failure

duck.js allows you to perform assertions on complex objects.
When those assertions fail, duck.js will try to produce helpful error messages.
For instance, suppose you want to assert the same property on an array of objects:

```javascript
var duck = require("duck");
var isArray = duck.isArray;
var hasProperties = duck.hasProperties;

var users = fetchUsers();
duck.assertThat(users, isArray([
    hasProperties({name: "Bob"}),
    hasProperties({name: "Jim"}),
]));
```

which might produce an error message like:

```
Expected [object with properties {
    name: 'Bob'
}, object with properties {
    name: 'Jim'
}]
but element at index 0 didn't match:
    value of property "name" didn't match:
        was 'Jim'
        expected 'Bob'
    expected object with properties {
        name: 'Bob'
    }
element at index 1 didn't match:
    value of property "name" didn't match:
        was 'Bob'
        expected 'Jim'
    expected object with properties {
        name: 'Jim'
    }
```

## API

The below is a quick reference to the API.
For more examples, take a look at the tests.

### duck.assertThat(value, matcher)

Assert that `value` satifies `matcher`.

If `value` satifies `matcher`, return normally, otherwise throw an
AssertionError describing the mismatch.

### duck.is(value)

If `value` is a matcher, return that matcher,
otherwise return `duck.equalTo(value)`.

### duck.equalTo(value)

Matcher for deep equality on `value`.

### duck.isObject(matcherObj)

An object `obj` matches `duck.isObject(matcherObj)` if:

* `obj` matches `duck.hasProperties(matcherObj)`, and
* there is no key that is present in `obj` but not in `matcherObj`

Sample usage:

```javascript
duck.isObject({
    name: "Bob",
    address: duck.isObject({
        city: "Cambridge",
        county: "UK"
    })
})
```

`duck.is` is called on each value of the matcher object, meaning that the
above is equivalent to:

```javascript
duck.isObject({
    name: duck.is("Bob"),
    address: duck.isObject({
        city: duck.is("Cambridge"),
        county: duck.is("UK")
    })
})
```

### duck.hasProperties(matcherProperties)

An object `obj` matches `duck.hasProperties(matcherProperties)` if,
for each `key` in `matcherProperties`, `matcherProperties[key].matches(obj[key])`

Sample usage:

```javascript
duck.hasProperties({
    name: "Bob",
    address: duck.hasProperties({
        city: "Cambridge",
        county: "UK"
    })
})
```

`duck.is` is called on each value of the matcher object, meaning that the
above is equivalent to:

```javascript
duck.hasProperties({
    name: duck.is("Bob"),
    address: duck.hasProperties({
        city: duck.is("Cambridge"),
        county: duck.is("UK")
    })
})
```

### duck.isArray(matcherArray)

An array `blah` matches `duck.isArray(matcherArray)` if:

* `blah.length == matcherArray.length`, and
* For `0 <= i < array.length`, `matcherArray[i].matches(blah[i])`

Sample usage:

```javascript
duck.isArray([
    duck.hasProperties({name: "Bob"}),
    duck.hasProperties({name: "Jim"}),
]))
```

`duck.is` is called on each element of the matcher array, meaning that the
following are equivalent:

```javascript
duck.isArray(["apple", "banana"])

duck.isArray([duck.is("apple"), duck.is("banana")])
```

### Matcher

Each matcher has the following methods:

#### matcher.matches(value)

Return `true` if `value` satifies this matcher, false otherwise.

#### matcher.describeMismatch(value)

Generate a string describing why `value` doesn't satisfy this matcher.
Behaviour is undefined if `value` actually satisifies the matcher.

#### matcher.matchesWithDescription(value)

Equivalent to:

```javascript
var isMatch = this.matches(value);
return {
    matches: isMatch,
    description: isMatch ? "" : this.describeMismatch(value)
};
```

Useful if you're likely to want both the boolean and the mismatch description.

#### matcher.describeSelf()

Generate a string describing the matcher.

## Thanks

Thanks to [Hamcrest](http://hamcrest.org/) for inspiration.
