
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLTableElement29";
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
    The insertRow() method inserts a new empty table row. 
    
    Retrieve the second TABLE element and invoke the insertRow() method
    with an index of two. Currently the 2nd indexed row is in the TBODY
    section of the TABLE.  The number of rows in the TBODY section before
    insertion of the new row is two.  After the new row is inserted the number 
    of rows in the TBODY section is three.

* @author NIST
* @author Rick Rivello
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-39872903
*/
function HTMLTableElement29() {
   var success;
    if(checkInitialization(builder, "HTMLTableElement29") != null) return;
    var nodeList;
      var tbodiesnodeList;
      var testNode;
      var bodyNode;
      var newRow;
      var rowsnodeList;
      var vsection1;
      var vsection2;
      var vrows;
      var doc;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "table");
      nodeList = doc.getElementsByTagName("table");
      assertSize("Asize",3,nodeList);
testNode = nodeList.item(1);
      tbodiesnodeList = testNode.tBodies;

      bodyNode = tbodiesnodeList.item(0);
      rowsnodeList = bodyNode.rows;

      vrows = rowsnodeList.length;

      assertEquals("rowsLink1",2,vrows);
       newRow = testNode.insertRow(2);
      tbodiesnodeList = testNode.tBodies;

      bodyNode = tbodiesnodeList.item(0);
      rowsnodeList = bodyNode.rows;

      vrows = rowsnodeList.length;

      assertEquals("rowsLink2",3,vrows);
       
}




function runTest() {
   HTMLTableElement29();
}
