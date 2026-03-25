
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLTableElement21";
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
      docsLoaded += preload(docRef, "doc", "table");
        
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
    The deleteTHead() method deletes the header from the table. 

    The deleteTHead() method will delete the THEAD Element from the
    second TABLE element.  First make sure that the THEAD element exists
    and then count the number of rows.  After the THEAD element is
    deleted there should be one less row.

* @author NIST
* @author Rick Rivello
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-38310198
*/
function HTMLTableElement21() {
   var success;
    if(checkInitialization(builder, "HTMLTableElement21") != null) return;
    var nodeList;
      var rowsnodeList;
      var testNode;
      var vsection1;
      var vsection2;
      var vrows;
      var doc;
      var result = new Array();

      expectedResult = new Array();
      expectedResult[0] = 4;
      expectedResult[1] = 3;

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "table");
      nodeList = doc.getElementsByTagName("table");
      assertSize("Asize",3,nodeList);
testNode = nodeList.item(1);
      vsection1 = testNode.tHead;

      assertNotNull("vsection1Id",vsection1);
rowsnodeList = testNode.rows;

      vrows = rowsnodeList.length;

      result[result.length] = vrows;
testNode.deleteTHead();
      vsection2 = testNode.tHead;

      rowsnodeList = testNode.rows;

      vrows = rowsnodeList.length;

      result[result.length] = vrows;
assertEqualsList("rowsLink",expectedResult,result);
       
}




function runTest() {
   HTMLTableElement21();
}
