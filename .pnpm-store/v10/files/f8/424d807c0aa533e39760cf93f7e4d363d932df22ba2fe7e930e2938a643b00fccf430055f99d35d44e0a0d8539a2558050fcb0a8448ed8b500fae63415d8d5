📬 **Available for contract or other opportunities(full time):**  
[📧 Email Me](mailto:bugwheels94@gmail.com)


# math-expression-evaluator
An extremely efficient, flexible and amazing evaluator for Math expression in Javascript.

## Use cases
|Input|Result|Explanation|
|:---:|:---:| --- |
|**2+3-1**|4| Addition and Subtraction operator |
|**2\*5/10**|1| Multiplication and Division operator |
|**tan45** *or* **tan(45)**|1| Trigonometric Function (tan in Degree mode) |
|**tan45** *or* **tan(45)**|1.619775190543862| Trigonometric Function (tan in Radian mode) |
|**Pi1,15,n** *or* **Pi(1,15,n)**|1307674368000| Product of Sequence |
|**Sigma1,15,n** *or* **Sigma(1,15,n)**|120| Sum of Sequence (also called summation)  |
|**2^3**|8| Exponent (note this operator is left associative like MS Office) |
|**5P3**|60| Permutaion Method to calculate all the permutaions |
|**sincostan90** *or* **sin(cos(tan(90)))**|0.017261434031253| Multiple functions with or without parenthesis (both works) |

### [Fiddle Yourself](https://jsbin.com/romatuc/edit?html,output)

## Installation
### Node JS
 **Using npm**

    npm install math-expression-evaluator

### Browser
 **Using bower**

    bower install math-expression-evaluator

## Usage

### Using eval method of mexp object

const mexp = new Mexp()
var value = mexp.eval(exp);  // 2 + 2

### Using constituents of eval methods of mexp object

1. Create mexp object

        const mexp = new Mexp
   
2. Parse an expression and then add additional detail to the tokens using

        var lexed = mexp.lex("expression");
    which returns an array of token which will be further processed by methods toPostfix and postfixEval

3. Now, that array is needed to be converted to postfix notation using

        var postfixed = mexp.toPostfix(lexed);  
    which converts the array to postfix notation and return new array

4. Now to get the value of expression use postfixEval

        var result = mexp.postfixEval(postfixed);  
    where result contains the result.


### Extending tokens

1. Defining a token

    A token is defined similar way as [1.x version](http://bugwheels94.github.io/math-expression-evaluator/). You may refer to test file on examples on how to add tokens. Since this package is TS compatible, you will get autocomplete on `mexp.addToken`


2. Adding tokens using addToken method of mexp object

        const mexp = new Mexp()
        mexp.addToken([token1, token2]) // tokens once added will be preserved in later evaluations

3. Adding tokens using eval method of mexp object

        const mexp = new Mexp()
        mexp.eval("expression", [token1, token2]) // tokens once added will be preserved in later evaluations

4. Adding token using constituents of eval method of mexp object

        const mexp = new Mexp()
        const answer = mexp.postfixEval(mexp.toPostfix(mexp.lexed("expression", [token1, token2]))) // tokens once added will be preserved in later evaluations
        console.log(answer)
## How to run test

    npm test

## Supported symbols

|Symbol|Explanation|
|:---:|:---:|
|**+**| Addition Operator eg. 2+3 results 5 |
|**-**| Subtraction Operator eg. 2-3 results -1 |
|**/**| Division operator eg 3/2 results 1.5 |
|**\***| Multiplication Operator eg. 2\*3 results 6 |
|**Mod**| Modulus Operator eg. 3 Mod 2 results 1 |
|**(**| Opening Parenthesis |
|**)**| Closing Parenthesis |
|**&**| Bitwise AND eg. 3&1 results 1 |
|**Sigma**| Summation eg. Sigma(1,100,n) results 5050 |
|**Pi**| Product eg. Pi(1,10,n) results 3628800 |
|**n**| Variable for Summation or Product |
|**pi**| Math constant pi returns 3.14 |
|**e**| Math constant e returns 2.71 |
|**C**| Combination operator eg. 4C2 returns 6 |
|**P**| Permutation operator eg. 4P2 returns 12 |
|**!**| factorial operator eg. 4! returns 24 |
|**log**| logarithmic function with base 10 eg. log 1000 returns 3 |
|**ln**| natural log function with base e eg. ln 2 returns .3010 |
|**pow**| power function with two operator pow(2,3) returns 8 |
|**^**| power operator eg. 2^3 returns 8 |
|**root**| underroot function root 4 returns 2 |
|**sin**| Sine function |
|**cos**| Cosine function |
|**tan**| Tangent function |
|**asin**| Inverse Sine function |
|**acos**| Inverse Cosine function |
|**atan**| Inverse Tangent function |
|**sinh**| Hyperbolic Sine function |
|**cosh**| Hyperbolic Cosine function |
|**tanh**| Hyperbolic Tangent function |
|**asinh**| Inverse Hyperbolic Sine function |
|**acosh**| Inverse Hyperbolic Cosine function |
|**atanh**| Inverse Hyperbolic Tangent function |

## Features

### Amazing support for Sigma and Pi
This is a fantastic feature of this calculator that it is capable of evaluating expressions containing **Sigma and Pi**.
Passing `Sigma(1,100,n)` will evaluate to 5050 as n is summationed from 1 to 100.
and Pi(1,15,n) will evaluate to 1307674368000 as n is multiplied from 1 to 15 which is equal to 15!

### Parenthesis less expression
If a expression is readable by human then it is readable by this evaluator. There is no need to wrap every function inside parenthesis.
For eg. sin90 will work totally fine instead of sin(90)

##Changelog

### Removed lodash.indexof and used native Array.prototype.indexOf hence dropping suppports for IE8 and below.
This will reflect in next release named v1.2.16
