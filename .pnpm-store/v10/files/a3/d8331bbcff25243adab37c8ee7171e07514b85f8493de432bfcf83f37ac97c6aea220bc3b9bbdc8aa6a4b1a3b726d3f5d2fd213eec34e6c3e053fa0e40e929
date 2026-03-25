## xpath
DOM 3 XPath 1.0 implemention and helper for JavaScript, with node.js support.

Originally written by Cameron McCormack ([blog](http://mcc.id.au/xpathjs)).

Additional contributions from  
Yaron Naveh ([blog](http://webservices20.blogspot.com/))  
goto100  
Thomas Weinert  
Jimmy Rishe  
and [others](https://github.com/goto100/xpath/graphs/contributors)

## Install
Install with [npm](http://github.com/isaacs/npm):

    npm install xpath

xpath is xml engine agnostic but I recommend to use [xmldom](https://github.com/jindw/xmldom):

    npm install xmldom

## API Documentation

Can be found [here](https://github.com/goto100/xpath/blob/master/docs/xpath%20methods.md). See below for example usage.

## Your first xpath:
`````javascript
var xpath = require('xpath')
  , dom = require('xmldom').DOMParser

var xml = "<book><title>Harry Potter</title></book>"
var doc = new dom().parseFromString(xml)
var nodes = xpath.select("//title", doc)

console.log(nodes[0].localName + ": " + nodes[0].firstChild.data)
console.log("Node: " + nodes[0].toString())
`````
➡

    title: Harry Potter
    Node: <title>Harry Potter</title>

### Alternatively

Using the same interface you have on modern browsers ([MDN])

`````javascript
var node = null;
var xml = "<book author='J. K. Rowling'><title>Harry Potter</title></book>"
var doc = new dom().parseFromString(xml)
var result = xpath.evaluate(
    "/book/title",            // xpathExpression
    doc,                        // contextNode
    null,                       // namespaceResolver
    xpath.XPathResult.ANY_TYPE, // resultType
    null                        // result
)

node = result.iterateNext();
while (node) {
    console.log(node.localName + ": " + node.firstChild.data);
    console.log("Node: " + node.toString());

    node = result.iterateNext();
}
`````
➡

    title: Harry Potter
    Node: <title>Harry Potter</title>

## Evaluate string values directly:
`````javascript
var xml = "<book><title>Harry Potter</title></book>";
var doc = new dom().parseFromString(xml);
var title = xpath.select("string(//title)", doc);

console.log(title);
`````
➡

    Harry Potter

## Namespaces
`````javascript
var xml = "<book><title xmlns='myns'>Harry Potter</title></book>"
var doc = new dom().parseFromString(xml)
var node = xpath.select("//*[local-name(.)='title' and namespace-uri(.)='myns']", doc)[0]

console.log(node.namespaceURI)
`````
➡

    myns

## Namespaces with easy mappings
`````javascript
var xml = "<book xmlns:bookml='http://example.com/book'><bookml:title>Harry Potter</bookml:title></book>"
var select = xpath.useNamespaces({"bookml": "http://example.com/book"});

console.log(select('//bookml:title/text()', doc)[0].nodeValue);
`````
➡

    Harry Potter

## Default namespace with mapping
`````javascript
var xml = "<book xmlns='http://example.com/book'><title>Harry Potter</title></book>"
var select = xpath.useNamespaces({"bookml": "http://example.com/book"});

console.log(select('//bookml:title/text()', doc)[0].nodeValue);
`````
➡

    Harry Potter

## Attributes
`````javascript
var xml = "<book author='J. K. Rowling'><title>Harry Potter</title></book>"
var doc = new dom().parseFromString(xml)
var author = xpath.select1("/book/@author", doc).value

console.log(author)
`````
➡

    J. K. Rowling

[MDN]: https://developer.mozilla.org/en/docs/Web/API/Document/evaluate

## License
MIT