# jest-mock-extended
> Type safe mocking extensions for Jest 🃏

[![Build Status](https://travis-ci.com/marchaos/jest-mock-extended.svg?branch=master)](https://travis-ci.com/marchaos/jest-mock-extended)
[![Coverage Status](https://coveralls.io/repos/github/marchaos/jest-mock-extended/badge.svg?branch=master)](https://coveralls.io/github/marchaos/jest-mock-extended?branch=master)
[![npm version](https://badge.fury.io/js/jest-mock-extended.svg)](https://badge.fury.io/js/jest-mock-extended)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm downloads](https://badgen.net/npm/dw/jest-mock-extended)](https://badge.fury.io/js/jest-mock-extended)

## Features
- Provides complete Typescript type safety for interfaces, argument types and return types
- Ability to mock any interface or object
- calledWith() extension to provide argument specific expectations, which works for objects and functions.
- Extensive Matcher API compatible with Jasmine matchers
- Supports mocking deep objects / class instances.
- Familiar Jest like API

## Installation
```bash
npm install jest-mock-extended --save-dev
```
or
```bash
yarn add jest-mock-extended --dev
```

## Example

```ts
import { mock } from 'jest-mock-extended';

interface PartyProvider {
   getPartyType: () => string;
   getSongs: (type: string) => string[]
   start: (type: string) => void;
}

describe('Party Tests', () => {
   test('Mock out an interface', () => {
       const mock = mock<PartyProvider>();
       mock.start('disco party');
       
       expect(mock.start).toHaveBeenCalledWith('disco party');
   });
   
   
   test('mock out a return type', () => {
       const mock = mock<PartyProvider>();
       mock.getPartyType.mockReturnValue('west coast party');
       
       expect(mock.getPartyType()).toBe('west coast party');
   });

    test('throwing an error if we forget to specify the return value')
        const mock = mock<PartyProvider>(
            {},
            {
                fallbackMockImplementation: () => {
                    throw new Error('not mocked');
                },
            }
        );

        expect(() => mock.getPartyType()).toThrowError('not mocked');
    });
```

## Assigning Mocks with a Type

If you wish to assign a mock to a variable that requires a type in your test, then you should use the MockProxy<> type
given that this will provide the apis for calledWith() and other built-in jest types for providing test functionality.

```ts
import { MockProxy, mock } from 'jest-mock-extended';

describe('test', () => {
    let myMock: MockProxy<MyInterface>;

    beforeEach(() => {
        myMock = mock<MyInterface>();
    })

    test(() => {
         myMock.calledWith(1).mockReturnValue(2);
         ...
    })
});

```

## calledWith() Extension

```jest-mock-extended``` allows for invocation matching expectations. Types of arguments, even when using matchers are type checked.

```ts
const provider = mock<PartyProvider>();
provider.getSongs.calledWith('disco party').mockReturnValue(['Dance the night away', 'Stayin Alive']);
expect(provider.getSongs('disco party')).toEqual(['Dance the night away', 'Stayin Alive']);

// Matchers
provider.getSongs.calledWith(any()).mockReturnValue(['Saw her standing there']);
provider.getSongs.calledWith(anyString()).mockReturnValue(['Saw her standing there']);

```
You can also use ```mockFn()``` to create a ```jest.fn()``` with the calledWith extension:

```ts
 type MyFn = (x: number, y: number) => Promise<string>;
 const fn = mockFn<MyFn>();
 fn.calledWith(1, 2).mockReturnValue('str');
```

## Clearing / Resetting Mocks

```jest-mock-extended``` exposes a mockClear and mockReset for resetting or clearing mocks with the same 
functionality as ```jest.fn()```.

```ts
import { mock, mockClear, mockReset } from 'jest-mock-extended';

describe('test', () => {
   const mock: UserService = mock<UserService>();
   
   beforeEach(() => {
      mockReset(mock); // or mockClear(mock)
   });
   ...
})
```

## Deep mocks

If your class has objects returns from methods that you would also like to mock, you can use ```mockDeep``` in 
replacement for mock.

```ts
import { mockDeep } from 'jest-mock-extended';

const mockObj: DeepMockProxy<Test1> = mockDeep<Test1>();
mockObj.deepProp.getNumber.calledWith(1).mockReturnValue(4);
expect(mockObj.deepProp.getNumber(1)).toBe(4);
```
if you also need support for properties on functions, you can pass in an option to enable this

```ts
import { mockDeep } from 'jest-mock-extended';

const mockObj: DeepMockProxy<Test1> = mockDeep<Test1>({ funcPropSupport: true });
mockObj.deepProp.calledWith(1).mockReturnValue(3)
mockObj.deepProp.getNumber.calledWith(1).mockReturnValue(4);

expect(mockObj.deepProp(1)).toBe(3);
expect(mockObj.deepProp.getNumber(1)).toBe(4);
```

Can can provide a fallback mock implementation used if you do not define a return value using `calledWith`.

```ts
import { mockDeep } from 'jest-mock-extended';
const mockObj = mockDeep<Test1>({
    fallbackMockImplementation: () => {
        throw new Error('please add expected return value using calledWith');
    },
});
expect(() => mockObj.getNumber()).toThrowError('not mocked');
```


## Available Matchers


| Matcher               | Description                                                           |
|-----------------------|-----------------------------------------------------------------------|
|any()                  | Matches any arg of any type.                                          |
|anyBoolean()           | Matches any boolean (true or false)                                   |
|anyString()            | Matches any string including empty string                             |
|anyNumber()            | Matches any number that is not NaN                                    |
|anyFunction()          | Matches any function                                                  |
|anyObject()            | Matches any object (typeof m === 'object') and is not null            |
|anyArray()             | Matches any array                                                     |
|anyMap()               | Matches any Map                                                       |
|anySet()               | Matches any Set                                                       |
|isA(class)             | e.g isA(DiscoPartyProvider)                                           |
|includes('value')      | Checks if value is in the argument array                              |
|containsKey('key')     |  Checks if the key exists in the object                               |
|containsValue('value') | Checks if the value exists in an object                               |
|has('value')           | checks if the value exists in a Set                                   |
|notNull()              | value !== null                                                        |
|notUndefined()         | value !== undefined                                                   |
|notEmpty()             | value !== undefined && value !== null && value !== ''                 |
|captor()               | Used to capture an arg - alternative to mock.calls[0][0]              |

## Writing a Custom Matcher

Custom matchers can be written using a ```MatcherCreator```

```ts
import { MatcherCreator, Matcher } from 'jest-mock-extended';

// expectedValue is optional
export const myMatcher: MatcherCreator<MyType> = (expectedValue) => new Matcher((actualValue) => {
    return (expectedValue === actualValue && actualValue.isSpecial);
});
```

By default, the expected value and actual value are the same type. In the case where you need to type the expected value 
differently than the actual value, you can use the optional 2 generic parameter:

```ts
import { MatcherCreator, Matcher } from 'jest-mock-extended';

// expectedValue is optional
export const myMatcher: MatcherCreator<string[], string> = (expectedValue) => new Matcher((actualValue) => {
    return (actualValue.includes(expectedValue));
});
```
