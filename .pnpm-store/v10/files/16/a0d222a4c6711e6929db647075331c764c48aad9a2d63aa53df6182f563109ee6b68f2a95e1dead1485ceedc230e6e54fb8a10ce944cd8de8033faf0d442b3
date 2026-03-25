
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLTableSectionElement18";
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
      docsLoaded += preload(docRef, "doc", "tablesection");
        
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
    
    Retrieve the first TBODY element and invoke the insertRow() method
    with an index of 0.  The nuber of rows in the TBODY section before 
    insertion of the new row is two.  After the new row is inserted the number 
    of rows in the TBODY section is three.

* @author NIST
* @author Rick Rivello
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-93995626
*/
function HTMLTableSectionElement18() {
   var success;
    if(checkInitialization(builder, "HTMLTableSectionElement18") != null) return;
    var nodeList;
      var testNode;
      var newRow;
      var rowsnodeList;
      var vrows;
      var doc;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "tablesection");
      nodeList = doc.getElementsByTagName("tbody");
      assertSize("Asize",2,nodeList);
testNode = nodeList.item(1);
      rowsnodeList = testNode.rows;

      vrows = rowsnodeList.length;

      assertEquals("rowsLink1",2,vrows);
       newRow = testNode.insertRow(0);
      rowsnodeList = testNode.rows;

      vrows = rowsnodeList.length;

      assertEquals("rowsLink2",3,vrows);
       
}




function runTest() {
   HTMLTableSectionElement18();
}
