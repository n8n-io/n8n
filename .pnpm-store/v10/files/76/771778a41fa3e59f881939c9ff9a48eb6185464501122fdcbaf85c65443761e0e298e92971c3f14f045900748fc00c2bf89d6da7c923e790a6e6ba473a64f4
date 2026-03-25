
/*
Copyright Â© 2001-2004 World Wide Web Consortium, 
(Massachusetts Institute of Technology, European Research Consortium 
for Informatics and Mathematics, Keio University). All 
Rights Reserved. This work is distributed under the W3CÂ® Software License [1] in the 
hope that it will be useful, but WITHOUT ANY WARRANTY; without even 
the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. 

[1] http://www.w3.org/Consortium/Legal/2002/copyright-software-20021231
*/



   /**
    *  Gets URI that identifies the test.
    *  @return uri identifier of test
    */
function getTargetURI() {
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLCollection04";
   }

var docsLoaded = -1000000;
var builder = null;

//
//   This function is called by the testing framework before
//      running the test suite.
//
//   If there are no configuration exceptions, asynchronous
//        document loading is started.  Otherwise, the status
//        is set to complete and the exception is immediately
//        raised when entering the body of the test.
//
function setUpPage() {
   setUpPageStatus = 'running';
   try {
     //
     //   creates test document builder, may throw exception
     //
     builder = createConfiguredBuilder();

      docsLoaded = 0;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      docsLoaded += preload(docRef, "doc", "collection");
        
       if (docsLoaded == 1) {
          setUpPageStatus = 'complete';
       }
    } catch(ex) {
    	catchInitializationError(builder, ex);
        setUpPageStatus = 'complete';
    }
}



//
//   This method is called on the completion of 
//      each asychronous load started in setUpTests.
//
//   When every synchronous loaded document has completed,
//      the page status is changed which allows the
//      body of the test to be executed.
function loadComplete() {
    if (++docsLoaded == 1) {
        setUpPageStatus = 'complete';
    }
}


/**
* 
    HTMLCollections are live, they are automatically updated when the     
    underlying document is changed.

    Create a HTMLCollection object by invoking the rows attribute of the    
    first TABLE element and examine its length, then add a new row and
    re-examine the length.

* @author NIST
* @author Rick Rivello
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-40057551
*/
function HTMLCollection04() {
   var success;
    if(checkInitialization(builder, "HTMLCollection04") != null) return;
    var nodeList;
      var testNode;
      var rowLength1;
      var rowLength2;
      var rowsnodeList;
      var newRow;
      var vrowindex;
      var doc;
      var result = new Array();

      expectedResult = new Array();
      expectedResult[0] = 4;
      expectedResult[1] = 5;

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "collection");
      nodeList = doc.getElementsByTagName("table");
      assertSize("Asize",1,nodeList);
testNode = nodeList.item(0);
      rowsnodeList = testNode.rows;

      rowLength1 = rowsnodeList.length;

      result[result.length] = rowLength1;
newRow = testNode.insertRow(4);
      rowLength2 = rowsnodeList.length;

      result[result.length] = rowLength2;
assertEqualsList("rowIndexLink",expectedResult,result);
       
}




function runTest() {
   HTMLCollection04();
}
