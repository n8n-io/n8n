
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLTableElement31";
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
      docsLoaded += preload(docRef, "doc", "table1");
        
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
    The insertRow() method inserts a new empty table row.  In addition, when
    the table is empty the row is inserted into a TBODY which is created
    and inserted into the table.
    
    Load the table1 file which has a non-empty table element.
    Create an empty TABLE element and append to the document.
    Check to make sure that the empty TABLE element doesn't
    have a TBODY element.  Insert a new row into the empty
    TABLE element.  Check for existence of the a TBODY element
    in the table.

* @author NIST
* @author Rick Rivello
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-39872903
* @see http://lists.w3.org/Archives/Public/www-dom-ts/2002Aug/0019.html
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=502
*/
function HTMLTableElement31() {
   var success;
    if(checkInitialization(builder, "HTMLTableElement31") != null) return;
    var nodeList;
      var testNode;
      var tableNode;
      var tbodiesnodeList;
      var newRow;
      var doc;
      var table;
      var tbodiesLength;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "table1");
      nodeList = doc.getElementsByTagName("body");
      assertSize("tableSize1",1,nodeList);
testNode = nodeList.item(0);
      table = doc.createElement("table");
      tableNode = testNode.appendChild(table);
      nodeList = doc.getElementsByTagName("table");
      assertSize("tableSize2",2,nodeList);
tbodiesnodeList = tableNode.tBodies;

      tbodiesLength = tbodiesnodeList.length;

      assertEquals("Asize3",0,tbodiesLength);
       newRow = tableNode.insertRow(0);
      tbodiesnodeList = tableNode.tBodies;

      tbodiesLength = tbodiesnodeList.length;

      assertEquals("Asize4",1,tbodiesLength);
       
}




function runTest() {
   HTMLTableElement31();
}
