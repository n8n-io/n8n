# class-validator

![Build Status](https://github.com/typestack/class-validator/workflows/CI/badge.svg)
[![codecov](https://codecov.io/gh/typestack/class-validator/branch/develop/graph/badge.svg)](https://codecov.io/gh/typestack/class-validator)
[![npm version](https://badge.fury.io/js/class-validator.svg)](https://badge.fury.io/js/class-validator)
[![install size](https://packagephobia.now.sh/badge?p=class-validator)](https://packagephobia.now.sh/result?p=class-validator)

Allows use of decorator and non-decorator based validation.
Internally uses [validator.js][1] to perform validation.
Class-validator works on both browser and node.js platforms.

## Table of Contents

- [class-validator](#class-validator)
  - [Table of Contents](#table-of-contents)
  - [Installation](#installation)
  - [Usage](#usage)
    - [Passing options](#passing-options)
  - [Validation errors](#validation-errors)
  - [Validation messages](#validation-messages)
  - [Validating arrays](#validating-arrays)
  - [Validating sets](#validating-sets)
  - [Validating maps](#validating-maps)
  - [Validating nested objects](#validating-nested-objects)
  - [Validating promises](#validating-promises)
  - [Inheriting Validation decorators](#inheriting-validation-decorators)
  - [Conditional validation](#conditional-validation)
  - [Whitelisting](#whitelisting)
  - [Passing context to decorators](#passing-context-to-decorators)
  - [Skipping missing properties](#skipping-missing-properties)
  - [Validation groups](#validation-groups)
  - [Custom validation classes](#custom-validation-classes)
  - [Custom validation decorators](#custom-validation-decorators)
  - [Using service container](#using-service-container)
  - [Synchronous validation](#synchronous-validation)
  - [Manual validation](#manual-validation)
  - [Validation decorators](#validation-decorators)
  - [Defining validation schema without decorators](#defining-validation-schema-without-decorators)
  - [Validating plain objects](#validating-plain-objects)
  - [Samples](#samples)
  - [Extensions](#extensions)
  - [Release notes](#release-notes)
  - [Contributing](#contributing)

## Installation

```
npm install class-validator --save
```

> Note: Please use at least npm@6 when using class-validator. From npm@6 the dependency tree is flattened, which is required by `class-validator` to function properly.

## Usage

Create your class and put some validation decorators on the properties you want to validate:

```typescript
import {
  validate,
  validateOrReject,
  Contains,
  IsInt,
  Length,
  IsEmail,
  IsFQDN,
  IsDate,
  Min,
  Max,
} from 'class-validator';

export class Post {
  @Length(10, 20)
  title: string;

  @Contains('hello')
  text: string;

  @IsInt()
  @Min(0)
  @Max(10)
  rating: number;

  @IsEmail()
  email: string;

  @IsFQDN()
  site: string;

  @IsDate()
  createDate: Date;
}

let post = new Post();
post.title = 'Hello'; // should not pass
post.text = 'this is a great post about hell world'; // should not pass
post.rating = 11; // should not pass
post.email = 'google.com'; // should not pass
post.site = 'googlecom'; // should not pass

validate(post).then(errors => {
  // errors is an array of validation errors
  if (errors.length > 0) {
    console.log('validation failed. errors: ', errors);
  } else {
    console.log('validation succeed');
  }
});

validateOrReject(post).catch(errors => {
  console.log('Promise rejected (validation failed). Errors: ', errors);
});
// or
async function validateOrRejectExample(input) {
  try {
    await validateOrReject(input);
  } catch (errors) {
    console.log('Caught promise rejection (validation failed). Errors: ', errors);
  }
}
```

### Passing options

The `validate` function optionally expects a `ValidatorOptions` object as a second parameter:

```ts
export interface ValidatorOptions {
  skipMissingProperties?: boolean;
  whitelist?: boolean;
  forbidNonWhitelisted?: boolean;
  groups?: string[];
  dismissDefaultMessages?: boolean;
  validationError?: {
    target?: boolean;
    value?: boolean;
  };

  forbidUnknownValues?: boolean;
  stopAtFirstError?: boolean;
}
```

> **IMPORTANT**
> The `forbidUnknownValues` value is set to `true` by default and **it is highly advised to keep the default**.
> Setting it to `false` will result unknown objects passing the validation!

## Validation errors

The `validate` method returns an array of `ValidationError` objects. Each `ValidationError` is:

```typescript
{
    target: Object; // Object that was validated.
    property: string; // Object's property that haven't pass validation.
    value: any; // Value that haven't pass a validation.
    constraints?: { // Constraints that failed validation with error messages.
        [type: string]: string;
    };
    children?: ValidationError[]; // Contains all nested validation errors of the property
}
```

In our case, when we validated a Post object, we have such an array of `ValidationError` objects:

```typescript
[{
    target: /* post object */,
    property: "title",
    value: "Hello",
    constraints: {
        length: "$property must be longer than or equal to 10 characters"
    }
}, {
    target: /* post object */,
    property: "text",
    value: "this is a great post about hell world",
    constraints: {
        contains: "text must contain a hello string"
    }
},
// and other errors
]
```

If you don't want a `target` to be exposed in validation errors, there is a special option when you use validator:

```typescript
validator.validate(post, { validationError: { target: false } });
```

This is especially useful when you send errors back over http, and you most probably don't want to expose
the whole target object.

## Validation messages

You can specify validation message in the decorator options and that message will be returned in the `ValidationError`
returned by the `validate` method (in the case that validation for this field fails).

```typescript
import { MinLength, MaxLength } from 'class-validator';

export class Post {
  @MinLength(10, {
    message: 'Title is too short',
  })
  @MaxLength(50, {
    message: 'Title is too long',
  })
  title: string;
}
```

There are few special tokens you can use in your messages:

- `$value` - the value that is being validated
- `$property` - name of the object's property being validated
- `$target` - name of the object's class being validated
- `$constraint1`, `$constraint2`, ... `$constraintN` - constraints defined by specific validation type

Example of usage:

```typescript
import { MinLength, MaxLength } from 'class-validator';

export class Post {
  @MinLength(10, {
    // here, $constraint1 will be replaced with "10", and $value with actual supplied value
    message: 'Title is too short. Minimal length is $constraint1 characters, but actual is $value',
  })
  @MaxLength(50, {
    // here, $constraint1 will be replaced with "50", and $value with actual supplied value
    message: 'Title is too long. Maximal length is $constraint1 characters, but actual is $value',
  })
  title: string;
}
```

Also you can provide a function, that returns a message. This allows you to create more granular messages:

```typescript
import { MinLength, MaxLength, ValidationArguments } from 'class-validator';

export class Post {
  @MinLength(10, {
    message: (args: ValidationArguments) => {
      if (args.value.length === 1) {
        return 'Too short, minimum length is 1 character';
      } else {
        return 'Too short, minimum length is ' + args.constraints[0] + ' characters';
      }
    },
  })
  title: string;
}
```

Message function accepts `ValidationArguments` which contains the following information:

- `value` - the value that is being validated
- `constraints` - array of constraints defined by specific validation type
- `targetName` - name of the object's class being validated
- `object` - object that is being validated
- `property` - name of the object's property being validated

## Validating arrays

If your field is an array and you want to perform validation of each item in the array you must specify a
special `each: true` decorator option:

```typescript
import { MinLength, MaxLength } from 'class-validator';

export class Post {
  @MaxLength(20, {
    each: true,
  })
  tags: string[];
}
```

This will validate each item in `post.tags` array.

## Validating sets

If your field is a set and you want to perform validation of each item in the set you must specify a
special `each: true` decorator option:

```typescript
import { MinLength, MaxLength } from 'class-validator';

export class Post {
  @MaxLength(20, {
    each: true,
  })
  tags: Set<string>;
}
```

This will validate each item in `post.tags` set.

## Validating maps

If your field is a map and you want to perform validation of each item in the map you must specify a
special `each: true` decorator option:

```typescript
import { MinLength, MaxLength } from 'class-validator';

export class Post {
  @MaxLength(20, {
    each: true,
  })
  tags: Map<string, string>;
}
```

This will validate each item in `post.tags` map.

## Validating nested objects

If your object contains nested objects and you want the validator to perform their validation too, then you need to
use the `@ValidateNested()` decorator:

```typescript
import { ValidateNested } from 'class-validator';

export class Post {
  @ValidateNested()
  user: User;
}
```

Please note that nested object _must_ be an instance of a class, otherwise `@ValidateNested` won't know what class is target of validation. Check also [Validating plain objects](#validating-plain-objects).

It also works with multi-dimensional array, like :

```typescript
import { ValidateNested } from 'class-validator';

export class Plan2D {
  @ValidateNested()
  matrix: Point[][];
}
```

## Validating promises

If your object contains property with `Promise`-returned value that should be validated, then you need to use the `@ValidatePromise()` decorator:

```typescript
import { ValidatePromise, Min } from 'class-validator';

export class Post {
  @Min(0)
  @ValidatePromise()
  userId: Promise<number>;
}
```

It also works great with `@ValidateNested` decorator:

```typescript
import { ValidateNested, ValidatePromise } from 'class-validator';

export class Post {
  @ValidateNested()
  @ValidatePromise()
  user: Promise<User>;
}
```

## Inheriting Validation decorators

When you define a subclass which extends from another one, the subclass will automatically inherit the parent's decorators. If a property is redefined in the descendant, class decorators will be applied on it from both its own class and the base class.

```typescript
import { validate } from 'class-validator';

class BaseContent {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

class User extends BaseContent {
  @MinLength(10)
  @MaxLength(20)
  name: string;

  @Contains('hello')
  welcome: string;

  @MinLength(20)
  password: string;
}

let user = new User();

user.email = 'invalid email'; // inherited property
user.password = 'too short'; // password wil be validated not only against IsString, but against MinLength as well
user.name = 'not valid';
user.welcome = 'helo';

validate(user).then(errors => {
  // ...
}); // it will return errors for email, title and text properties
```

## Conditional validation

The conditional validation decorator (`@ValidateIf`) can be used to ignore the validators on a property when the provided condition function returns false. The condition function takes the object being validated and must return a `boolean`.

```typescript
import { ValidateIf, IsNotEmpty } from 'class-validator';

export class Post {
  otherProperty: string;

  @ValidateIf(o => o.otherProperty === 'value')
  @IsNotEmpty()
  example: string;
}
```

In the example above, the validation rules applied to `example` won't be run unless the object's `otherProperty` is `"value"`.

Note that when the condition is false all validation decorators are ignored, including `isDefined`.

## Whitelisting

Even if your object is an instance of a validation class it can contain additional properties that are not defined.
If you do not want to have such properties on your object, pass special flag to `validate` method:

```typescript
import { validate } from 'class-validator';
// ...
validate(post, { whitelist: true });
```

This will strip all properties that don't have any decorators. If no other decorator is suitable for your property,
you can use @Allow decorator:

```typescript
import {validate, Allow, Min} from "class-validator";

export class Post {

    @Allow()
    title: string;

    @Min(0)
    views: number;

    nonWhitelistedProperty: number;
}

let post = new Post();
post.title = 'Hello world!';
post.views = 420;

post.nonWhitelistedProperty = 69;
(post as any).anotherNonWhitelistedProperty = "something";

validate(post).then(errors => {
  // post.nonWhitelistedProperty is not defined
  // (post as any).anotherNonWhitelistedProperty is not defined
  ...
});
```

If you would rather to have an error thrown when any non-whitelisted properties are present, pass another flag to
`validate` method:

```typescript
import { validate } from 'class-validator';
// ...
validate(post, { whitelist: true, forbidNonWhitelisted: true });
```

## Passing context to decorators

It's possible to pass a custom object to decorators which will be accessible on the `ValidationError` instance of the property if validation failed.

```ts
import { validate } from 'class-validator';

class MyClass {
  @MinLength(32, {
    message: 'EIC code must be at least 32 characters',
    context: {
      errorCode: 1003,
      developerNote: 'The validated string must contain 32 or more characters.',
    },
  })
  eicCode: string;
}

const model = new MyClass();

validate(model).then(errors => {
  //errors[0].contexts['minLength'].errorCode === 1003
});
```

## Skipping missing properties

Sometimes you may want to skip validation of the properties that do not exist in the validating object. This is
usually desirable when you want to update some parts of the object, and want to validate only updated parts,
but skip everything else, e.g. skip missing properties.
In such situations you will need to pass a special flag to `validate` method:

```typescript
import { validate } from 'class-validator';
// ...
validate(post, { skipMissingProperties: true });
```

When skipping missing properties, sometimes you want not to skip all missing properties, some of them maybe required
for you, even if skipMissingProperties is set to true. For such cases you should use `@IsDefined()` decorator.
`@IsDefined()` is the only decorator that ignores `skipMissingProperties` option.

## Validation groups

In different situations you may want to use different validation schemas of the same object.
In such cases you can use validation groups.

> **IMPORTANT**
> Calling a validation with a group combination that would not result in a validation (eg: non existent group name)
> will result in a unknown value error. When validating with groups the provided group combination should match at least one decorator.

```typescript
import { validate, Min, Length } from 'class-validator';

export class User {
  @Min(12, {
    groups: ['registration'],
  })
  age: number;

  @Length(2, 20, {
    groups: ['registration', 'admin'],
  })
  name: string;
}

let user = new User();
user.age = 10;
user.name = 'Alex';

validate(user, {
  groups: ['registration'],
}); // this will not pass validation

validate(user, {
  groups: ['admin'],
}); // this will pass validation

validate(user, {
  groups: ['registration', 'admin'],
}); // this will not pass validation

validate(user, {
  groups: undefined, // the default
}); // this will not pass validation since all properties get validated regardless of their groups

validate(user, {
  groups: [],
}); // this will not pass validation, (equivalent to 'groups: undefined', see above)
```

There is also a special flag `always: true` in validation options that you can use. This flag says that this validation
must be applied always no matter which group is used.

## Custom validation classes

If you have custom validation logic you can create a _Constraint class_:

1. First create a file, lets say `CustomTextLength.ts`, and define a new class:

   ```typescript
   import { ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';

   @ValidatorConstraint({ name: 'customText', async: false })
   export class CustomTextLength implements ValidatorConstraintInterface {
     validate(text: string, args: ValidationArguments) {
       return text.length > 1 && text.length < 10; // for async validations you must return a Promise<boolean> here
     }

     defaultMessage(args: ValidationArguments) {
       // here you can provide default error message if validation failed
       return 'Text ($value) is too short or too long!';
     }
   }
   ```

   We marked our class with `@ValidatorConstraint` decorator.
   You can also supply a validation constraint name - this name will be used as "error type" in ValidationError.
   If you will not supply a constraint name - it will be auto-generated.

   Our class must implement `ValidatorConstraintInterface` interface and its `validate` method,
   which defines validation logic. If validation succeeds, method returns true, otherwise false.
   Custom validator can be asynchronous, if you want to perform validation after some asynchronous
   operations, simply return a promise with boolean inside in `validate` method.

   Also we defined optional method `defaultMessage` which defines a default error message,
   in the case that the decorator's implementation doesn't set an error message.

2) Then you can use your new validation constraint in your class:

   ```typescript
   import { Validate } from 'class-validator';
   import { CustomTextLength } from './CustomTextLength';

   export class Post {
     @Validate(CustomTextLength, {
       message: 'Title is too short or long!',
     })
     title: string;
   }
   ```

   Here we set our newly created `CustomTextLength` validation constraint for `Post.title`.

3) And use validator as usual:

   ```typescript
   import { validate } from 'class-validator';

   validate(post).then(errors => {
     // ...
   });
   ```

You can also pass constraints to your validator, like this:

```typescript
import { Validate } from 'class-validator';
import { CustomTextLength } from './CustomTextLength';

export class Post {
  @Validate(CustomTextLength, [3, 20], {
    message: 'Wrong post title',
  })
  title: string;
}
```

And use them from `validationArguments` object:

```typescript
import { ValidationArguments, ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

@ValidatorConstraint()
export class CustomTextLength implements ValidatorConstraintInterface {
  validate(text: string, validationArguments: ValidationArguments) {
    return text.length > validationArguments.constraints[0] && text.length < validationArguments.constraints[1];
  }
}
```

## Custom validation decorators

You can also create a custom decorators. Its the most elegant way of using a custom validations.
Lets create a decorator called `@IsLongerThan`:

1. Create a decorator itself:

   ```typescript
   import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

   export function IsLongerThan(property: string, validationOptions?: ValidationOptions) {
     return function (object: Object, propertyName: string) {
       registerDecorator({
         name: 'isLongerThan',
         target: object.constructor,
         propertyName: propertyName,
         constraints: [property],
         options: validationOptions,
         validator: {
           validate(value: any, args: ValidationArguments) {
             const [relatedPropertyName] = args.constraints;
             const relatedValue = (args.object as any)[relatedPropertyName];
             return typeof value === 'string' && typeof relatedValue === 'string' && value.length > relatedValue.length; // you can return a Promise<boolean> here as well, if you want to make async validation
           },
         },
       });
     };
   }
   ```

2. Put it to use:

   ```typescript
   import { IsLongerThan } from './IsLongerThan';

   export class Post {
     title: string;

     @IsLongerThan('title', {
       /* you can also use additional validation options, like "groups" in your custom validation decorators. "each" is not supported */
       message: 'Text must be longer than the title',
     })
     text: string;
   }
   ```

In your custom decorators you can also use `ValidationConstraint`.
Lets create another custom validation decorator called `IsUserAlreadyExist`:

1. Create a ValidationConstraint and decorator:

   ```typescript
   import {
     registerDecorator,
     ValidationOptions,
     ValidatorConstraint,
     ValidatorConstraintInterface,
     ValidationArguments,
   } from 'class-validator';

   @ValidatorConstraint({ async: true })
   export class IsUserAlreadyExistConstraint implements ValidatorConstraintInterface {
     validate(userName: any, args: ValidationArguments) {
       return UserRepository.findOneByName(userName).then(user => {
         if (user) return false;
         return true;
       });
     }
   }

   export function IsUserAlreadyExist(validationOptions?: ValidationOptions) {
     return function (object: Object, propertyName: string) {
       registerDecorator({
         target: object.constructor,
         propertyName: propertyName,
         options: validationOptions,
         constraints: [],
         validator: IsUserAlreadyExistConstraint,
       });
     };
   }
   ```

   note that we marked our constraint that it will by async by adding `{ async: true }` in validation options.

2. And put it to use:

   ```typescript
   import { IsUserAlreadyExist } from './IsUserAlreadyExist';

   export class User {
     @IsUserAlreadyExist({
       message: 'User $value already exists. Choose another name.',
     })
     name: string;
   }
   ```

## Using service container

Validator supports service container in the case if want to inject dependencies into your custom validator constraint
classes. Here is example how to integrate it with [typedi][2]:

```typescript
import { Container } from 'typedi';
import { useContainer, Validator } from 'class-validator';

// do this somewhere in the global application level:
useContainer(Container);
let validator = Container.get(Validator);

// now everywhere you can inject Validator class which will go from the container
// also you can inject classes using constructor injection into your custom ValidatorConstraint-s
```

## Synchronous validation

If you want to perform a simple non async validation you can use `validateSync` method instead of regular `validate`
method. It has the same arguments as `validate` method. But note, this method **ignores** all async validations
you have.

## Manual validation

There are several method exist in the Validator that allows to perform non-decorator based validation:

```typescript
import { isEmpty, isBoolean } from 'class-validator';

isEmpty(value);
isBoolean(value);
```

## Validation decorators

<!-- Disable table formatting because Prettier messing it up. -->
<!-- prettier-ignore -->
| Decorator                                       | Description |
| ------------------------------------------------| ----------- |
| **Common validation decorators**                | |
| `@IsDefined(value: any)`                        | Checks if value is defined (!== undefined, !== null). This is the only decorator that ignores skipMissingProperties option. |
| `@IsOptional()`                                 | Checks if given value is empty (=== null, === undefined) and if so, ignores all the validators on the property. |
| `@Equals(comparison: any)`                      | Checks if value equals ("===") comparison. |
| `@NotEquals(comparison: any)`                   | Checks if value not equal ("!==") comparison. |
| `@IsEmpty()`                                    | Checks if given value is empty (=== '', === null, === undefined). |
| `@IsNotEmpty()`                                 | Checks if given value is not empty (!== '', !== null, !== undefined). |
| `@IsIn(values: any[])`                          | Checks if value is in an array of allowed values. |
| `@IsNotIn(values: any[])`                       | Checks if value is not in an array of disallowed values. |
| **Type validation decorators**                  | |
| `@IsBoolean()`                                  | Checks if a value is a boolean. |
| `@IsDate()`                                     | Checks if the value is a date. |
| `@IsString()`                                   | Checks if the value is a string. |
| `@IsNumber(options: IsNumberOptions)`           | Checks if the value is a number. |
| `@IsInt()`                                      | Checks if the value is an integer number. |
| `@IsArray()`                                    | Checks if the value is an array |
| `@IsEnum(entity: object)`                       | Checks if the value is a valid enum |
| **Number validation decorators**                |
| `@IsDivisibleBy(num: number)`                   | Checks if the value is a number that's divisible by another. |
| `@IsPositive()`                                 | Checks if the value is a positive number greater than zero. |
| `@IsNegative()`                                 | Checks if the value is a negative number smaller than zero. |
| `@Min(min: number)`                             | Checks if the given number is greater than or equal to given number. |
| `@Max(max: number)`                             | Checks if the given number is less than or equal to given number. |
| **Date validation decorators**                  |
| `@MinDate(date: Date | (() => Date))`           | Checks if the value is a date that's after the specified date. |
| `@MaxDate(date: Date | (() => Date))`           | Checks if the value is a date that's before the specified date. |  
| **String-type validation decorators**           | |
| `@IsBooleanString()`                            | Checks if a string is a boolean (e.g. is "true" or "false" or "1", "0"). |
| `@IsDateString()`                               | Alias for `@IsISO8601()`. |
| `@IsNumberString(options?: IsNumericOptions)`   | Checks if a string is a number. |
| **String validation decorators**                | |
| `@Contains(seed: string)`                       | Checks if the string contains the seed. |
| `@NotContains(seed: string)`                    | Checks if the string not contains the seed. |
| `@IsAlpha()`                                    | Checks if the string contains only letters (a-zA-Z). |
| `@IsAlphanumeric()`                             | Checks if the string contains only letters and numbers. |
| `@IsDecimal(options?: IsDecimalOptions)`        | Checks if the string is a valid decimal value. Default IsDecimalOptions are `force_decimal=False`, `decimal_digits: '1,'`, `locale: 'en-US'` |
| `@IsAscii()`                                    | Checks if the string contains ASCII chars only. |
| `@IsBase32()`                                   | Checks if a string is base32 encoded. |
| `@IsBase58()`                                   | Checks if a string is base58 encoded. |
| `@IsBase64()`                                   | Checks if a string is base64 encoded. |
| `@IsIBAN()`                                     | Checks if a string is a IBAN (International Bank Account Number). |
| `@IsBIC()`                                      | Checks if a string is a BIC (Bank Identification Code) or SWIFT code. |
| `@IsByteLength(min: number, max?: number)`      | Checks if the string's length (in bytes) falls in a range. |
| `@IsCreditCard()`                               | Checks if the string is a credit card. |
| `@IsCurrency(options?: IsCurrencyOptions)`      | Checks if the string is a valid currency amount. |
| `@IsISO4217CurrencyCode()`                      | Checks if the string is an ISO 4217 currency code. |
| `@IsEthereumAddress()`                          | Checks if the string is an Ethereum address using basic regex. Does not validate address checksums. |
| `@IsBtcAddress()`                               | Checks if the string is a valid BTC address. |
| `@IsDataURI()`                                  | Checks if the string is a data uri format. |
| `@IsEmail(options?: IsEmailOptions)`            | Checks if the string is an email.|
| `@IsFQDN(options?: IsFQDNOptions)`              | Checks if the string is a fully qualified domain name (e.g. domain.com). |
| `@IsFullWidth()`                                | Checks if the string contains any full-width chars. |
| `@IsHalfWidth()`                                | Checks if the string contains any half-width chars. |
| `@IsVariableWidth()`                            | Checks if the string contains a mixture of full and half-width chars. |
| `@IsHexColor()`                                 | Checks if the string is a hexadecimal color. |
| `@IsHSL()`                                      | Checks if the string is an HSL color based on [CSS Colors Level 4 specification](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value). |
| `@IsRgbColor(options?: IsRgbOptions)`           | Checks if the string is a rgb or rgba color. |
| `@IsIdentityCard(locale?: string)`              | Checks if the string is a valid identity card code. |
| `@IsPassportNumber(countryCode?: string)`       | Checks if the string is a valid passport number relative to a specific country code. |
| `@IsPostalCode(locale?: string)`                | Checks if the string is a postal code. |
| `@IsHexadecimal()`                              | Checks if the string is a hexadecimal number. |
| `@IsOctal()`                                    | Checks if the string is a octal number. |
| `@IsMACAddress(options?: IsMACAddressOptions)`  | Checks if the string is a MAC Address. |
| `@IsIP(version?: "4"\|"6")`                     | Checks if the string is an IP (version 4 or 6). |
| `@IsPort()`                                     | Checks if the string is a valid port number. |
| `@IsISBN(version?: "10"\|"13")`                 | Checks if the string is an ISBN (version 10 or 13). |
| `@IsEAN()`                                      | Checks if the string is an if the string is an EAN (European Article Number). |
| `@IsISIN()`                                     | Checks if the string is an ISIN (stock/security identifier). |
| `@IsISO8601(options?: IsISO8601Options)`        | Checks if the string is a valid ISO 8601 date format. Use the option strict = true for additional checks for a valid date. |
| `@IsJSON()`                                     | Checks if the string is valid JSON. |
| `@IsJWT()`                                      | Checks if the string is valid JWT. |
| `@IsObject()`                                   | Checks if the object is valid Object (null, functions, arrays will return false). |
| `@IsNotEmptyObject()`                           | Checks if the object is not empty. |
| `@IsLowercase()`                                | Checks if the string is lowercase. |
| `@IsLatLong()`                                  | Checks if the string is a valid latitude-longitude coordinate in the format lat, long. |
| `@IsLatitude()`                                 | Checks if the string or number is a valid latitude coordinate. |
| `@IsLongitude()`                                | Checks if the string or number is a valid longitude coordinate. |
| `@IsMobilePhone(locale: string)`                | Checks if the string is a mobile phone number. |
| `@IsISO31661Alpha2()`                           | Checks if the string is a valid ISO 3166-1 alpha-2 officially assigned country code. |
| `@IsISO31661Alpha3()`                           | Checks if the string is a valid ISO 3166-1 alpha-3 officially assigned country code. |
| `@IsLocale()`                                   | Checks if the string is a locale. |
| `@IsPhoneNumber(region: string)`                | Checks if the string is a valid phone number using libphonenumber-js. |
| `@IsMongoId()`                                  | Checks if the string is a valid hex-encoded representation of a MongoDB ObjectId. |
| `@IsMultibyte()`                                | Checks if the string contains one or more multibyte chars. |
| `@IsNumberString(options?: IsNumericOptions)`   | Checks if the string is numeric. |
| `@IsSurrogatePair()`                            | Checks if the string contains any surrogate pairs chars. |
| `@IsTaxId()`                                    | Checks if the string is a valid tax ID. Default locale is `en-US`.
| `@IsUrl(options?: IsURLOptions)`                | Checks if the string is a URL. |
| `@IsMagnetURI()`                                | Checks if the string is a [magnet uri format](https://en.wikipedia.org/wiki/Magnet_URI_scheme). |
| `@IsUUID(version?: "3"\|"4"\|"5"\|"all")`       | Checks if the string is a UUID (version 3, 4, 5 or all ). |
| `@IsFirebasePushId()`                           | Checks if the string is a [Firebase Push ID](https://firebase.googleblog.com/2015/02/the-2120-ways-to-ensure-unique_68.html) |
| `@IsUppercase()`                                | Checks if the string is uppercase. |
| `@Length(min: number, max?: number)`            | Checks if the string's length falls in a range. |
| `@MinLength(min: number)`                       | Checks if the string's length is not less than given number. |
| `@MaxLength(max: number)`                       | Checks if the string's length is not more than given number. |
| `@Matches(pattern: RegExp, modifiers?: string)` | Checks if string matches the pattern. Either matches('foo', /foo/i) or matches('foo', 'foo', 'i'). |
| `@IsMilitaryTime()`                             | Checks if the string is a valid representation of military time in the format HH:MM. |
| `@IsTimeZone()`                                 | Checks if the string represents a valid IANA time-zone. |
| `@IsHash(algorithm: string)`                    | Checks if the string is a hash The following types are supported:`md4`, `md5`, `sha1`, `sha256`, `sha384`, `sha512`, `ripemd128`, `ripemd160`, `tiger128`, `tiger160`, `tiger192`, `crc32`, `crc32b`. |
| `@IsMimeType()`                                 | Checks if the string matches to a valid [MIME type](https://en.wikipedia.org/wiki/Media_type) format |
| `@IsSemVer()`                                   | Checks if the string is a Semantic Versioning Specification (SemVer). |
| `@IsISSN(options?: IsISSNOptions)`              | Checks if the string is a ISSN. |
| `@IsISRC()`                                     | Checks if the string is a [ISRC](https://en.wikipedia.org/wiki/International_Standard_Recording_Code). |
| `@IsRFC3339()`                                  | Checks if the string is a valid [RFC 3339](https://tools.ietf.org/html/rfc3339) date. |
| `@IsStrongPassword(options?: IsStrongPasswordOptions)` | Checks if the string is a strong password. |
| **Array validation decorators**                 | |
| `@ArrayContains(values: any[])`                 | Checks if array contains all values from the given array of values. |
| `@ArrayNotContains(values: any[])`              | Checks if array does not contain any of the given values. |
| `@ArrayNotEmpty()`                              | Checks if given array is not empty. |
| `@ArrayMinSize(min: number)`                    | Checks if the array's length is greater than or equal to the specified number. |
| `@ArrayMaxSize(max: number)`                    | Checks if the array's length is less or equal to the specified number. |
| `@ArrayUnique(identifier?: (o) => any)`         | Checks if all array's values are unique. Comparison for objects is reference-based. Optional function can be speciefied which return value will be used for the comparsion. |
| **Object validation decorators**                |
| `@IsInstance(value: any)`                       | Checks if the property is an instance of the passed value. |
| **Other decorators**                            | |
| `@Allow()`                                      | Prevent stripping off the property when no other constraint is specified for it. |

## Defining validation schema without decorators

Schema-based validation without decorators is no longer supported by `class-validator`. This feature was broken in version 0.12 and it will not be fixed. If you are interested in schema-based validation, you can find several such frameworks in [the zod readme's comparison section](https://github.com/colinhacks/zod#comparison).

## Validating plain objects

Due to nature of the decorators, the validated object has to be instantiated using `new Class()` syntax. If you have your class defined using class-validator decorators and you want to validate plain JS object (literal object or returned by JSON.parse), you need to transform it to the class instance via using [class-transformer](https://github.com/pleerock/class-transformer)).

## Samples

Take a look on samples in [./sample](https://github.com/pleerock/class-validator/tree/master/sample) for more examples of
usages.

## Extensions

There are several extensions that simplify class-validator integration with other modules:

- [class-validator integration](https://github.com/19majkel94/class-transformer-validator) with [class-transformer](https://github.com/pleerock/class-transformer)
- [class-validator-rule](https://github.com/yantrab/class-validator-rule)
- [ngx-dynamic-form-builder](https://github.com/EndyKaufman/ngx-dynamic-form-builder)
- [abarghoud/ngx-reactive-form-class-validator](https://github.com/abarghoud/ngx-reactive-form-class-validator)

## Release notes

See information about breaking changes and release notes [here][3].

[1]: https://github.com/chriso/validator.js
[2]: https://github.com/pleerock/typedi
[3]: CHANGELOG.md

## Contributing

For information about how to contribute to this project, see [TypeStack's general contribution guide](https://github.com/typestack/.github/blob/master/CONTRIBUTING.md).
