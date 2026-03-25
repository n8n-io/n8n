
//#region src/output_parsers/expression_type_handlers/grammar/parser_grammar.ts
/**
* Here's the main parser for our expression parser. It's a pared down
* Javascript parser with a whole lot of rules removed, leaving only
* rules for parsing literals (i.e. string literal,numeric literal,
* boolean literal, array literal, object literal and null literal),
* identifiers, and expressions (i.e. call expression, member expression,
* array expression and object expression).
*
* For more information see:
* https://peggyjs.org/documentation.html
* https://github.com/peggyjs/peggy/blob/main/examples/javascript.pegjs
*/
const GRAMMAR = `{{
    var TYPES_TO_PROPERTY_NAMES = {
      CallExpression:   "callee",
      MemberExpression: "object",
    };
  
    function extractOptional(optional, index) {
      return optional ? optional[index] : null;
    };
  
    function extractList(list, index) {
      return list.map(function(element) { return element[index]; });
    };
  
    function buildList(head, tail, index) {
      return [head].concat(extractList(tail, index));
    };
  
    function optionalList(value) {
      return value !== null ? value : [];
    };
  }}
  
  Start
    = __ program:Program __ { return program; };
  
  SourceCharacter
    = .;
  
  WhiteSpace
    = "\\t"
    / "\\v"
    / "\\f"
    / " "
    / "\\u00A0"
    / "\\uFEFF";
  
  Identifier
    = !ReservedWord name:IdentifierName { return name; };
  
  IdentifierName
    = head:IdentifierStart tail:IdentifierPart* {
        return {
          type: "Identifier",
          name: head + tail.join("")
        };
      };
  
  IdentifierStart
    = UnicodeLetter
    / "$"
    / "_";
  
  IdentifierPart
    = IdentifierStart
    / Nd
    / "\\u200C"
    / "\\u200D";
  
  UnicodeLetter
    = Lu
    / Ll;
  
  ReservedWord
    = NullToken
    / TrueToken
    / FalseToken;
  
  Literal
    = NullLiteral
    / BooleanLiteral
    / NumericLiteral
    / StringLiteral;
  
  NullLiteral
    = NullToken { return { type: "NullLiteral", value: null }; };
  
  BooleanLiteral
    = TrueToken { return { type: "BooleanLiteral", value: true  }; }
    / FalseToken { return { type: "BooleanLiteral", value: false }; };
  
  NumericLiteral
    = literal:DecimalLiteral !(IdentifierStart / DecimalDigit) {
        return literal;
      };
  
  DecimalLiteral
    = DecimalIntegerLiteral "." DecimalDigit* {
        return { type: "NumericLiteral", value: parseFloat(text()) };
      }
    / "." DecimalDigit+ {
        return { type: "NumericLiteral", value: parseFloat(text()) };
      }
    / DecimalIntegerLiteral {
        return { type: "NumericLiteral", value: parseFloat(text()) };
      };
  
  DecimalIntegerLiteral
    = "0"
    / NonZeroDigit DecimalDigit*;
  
  DecimalDigit
    = [0-9];
  
  NonZeroDigit
    = [1-9];
  
  StringLiteral
    = '"' chars:DoubleStringCharacter* '"' {
        return { type: "StringLiteral", value: chars.join("") };
      }
    / "'" chars:SingleStringCharacter* "'" {
        return { type: "StringLiteral", value: chars.join("") };
      };
  
  DoubleStringCharacter
    = !('"' / "\\\\") SourceCharacter { return text(); };
  
  SingleStringCharacter
    = !("'" / "\\\\") SourceCharacter { return text(); };
  
  SingleEscapeCharacter
    = "'"
    / '"';
  
  Ll = [a-z];
  Lu = [A-Z];
  Nd = [0-9];
  
  FalseToken = "false" !IdentifierPart;
  TrueToken = "true" !IdentifierPart;
  NullToken = "null" !IdentifierPart;
  
  __ = WhiteSpace*;
  
  PrimaryExpression
    = Identifier
    / Literal
    / ArrayExpression
    / ObjectExpression
    / "(" __ expression:Expression __ ")" { return expression; };
  
  ArrayExpression
    = "[" __ "]" { return { type: "ArrayExpression", elements: [] }; }
    / "[" __ elements:ElementList __ "]" {
        return {
          type: "ArrayExpression",
          elements: elements
        };
      };
  
  ElementList
    = head:(
        element:Expression {
          return element;
        }
      )
      tail:(
        __ "," __ element:Expression {
          return element;
        }
      )*
      { return Array.prototype.concat.apply(head, tail); };
  
  ObjectExpression
    = "{" __ "}" { return { type: "ObjectExpression", properties: [] }; }
    / "{" __ properties:PropertyNameAndValueList __ "}" {
         return { type: "ObjectExpression", properties: properties };
       }
    / "{" __ properties:PropertyNameAndValueList __ "," __ "}" {
         return { type: "ObjectExpression", properties: properties };
       };
  PropertyNameAndValueList
    = head:PropertyAssignment tail:(__ "," __ PropertyAssignment)* {
        return buildList(head, tail, 3);
      };
  
  PropertyAssignment
    = key:PropertyName __ ":" __ value:Expression {
        return { type: "PropertyAssignment", key: key, value: value, kind: "init" };
      };
  
  PropertyName
    = IdentifierName
    / StringLiteral
    / NumericLiteral;
  
  Node
    = ArrayExpression 
    / BooleanLiteral 
    / CallExpression 
    / Identifier 
    / MemberExpression 
    / NumericLiteral 
    / ObjectExpression 
    / PropertyAssignment 
    / StringLiteral
  
  MemberExpression
    = head:(PrimaryExpression)
      tail:(
          __ "[" __ property:Expression __ "]" {
            return { property: property, computed: true };
          }
        / __ "." __ property:IdentifierName {
            return { property: property, computed: false };
          }
      )*
      {
        return tail.reduce(function(result, element) {
          return {
            type: "MemberExpression",
            object: result,
            property: element.property,
            computed: element.computed
          };
        }, head);
      };
  
  CallExpression
    = head:(
        callee:MemberExpression __ args:Arguments {
          return { type: "CallExpression", callee: callee, arguments: args };
        }
      )
      tail:(
          __ args:Arguments {
            return { type: "CallExpression", arguments: args };
          }
        / __ "[" __ property:Expression __ "]" {
            return {
              type: "MemberExpression",
              property: property,
              computed: true
            };
          }
        / __ "." __ property:IdentifierName {
            return {
              type: "MemberExpression",
              property: property,
              computed: false
            };
          }
      )*
      {
        return tail.reduce(function(result, element) {
          element[TYPES_TO_PROPERTY_NAMES[element.type]] = result;
  
          return element;
        }, head);
      };
  
  Arguments
    = "(" __ args:(ArgumentList __)? ")" {
        return optionalList(extractOptional(args, 0));
      };
  
  ArgumentList
    = head:Expression tail:(__ "," __ Expression)* {
        return buildList(head, tail, 3);
      };
  
  Expression
    = CallExpression
    / MemberExpression;
  
  ExpressionStatement
    = expression:Expression {
        return {
          type: "ExpressionStatement",
          expression: expression
        };
      };
  
  Program
    = exp:ExpressionStatement {
        return {
          type: "Program",
          body: exp
        };
      };`;

//#endregion
exports.GRAMMAR = GRAMMAR;
//# sourceMappingURL=parser_grammar.cjs.map