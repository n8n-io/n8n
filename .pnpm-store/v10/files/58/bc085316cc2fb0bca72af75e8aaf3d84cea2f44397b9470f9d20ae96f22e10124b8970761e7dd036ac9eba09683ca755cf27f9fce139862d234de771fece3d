
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/html/HTMLTableRowElement12";
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
      docsLoaded += preload(docRef, "doc", "tablerow");
        
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
    The insertCell() method inserts an empty TD cell into this row. 

    
    Retrieve the fourth TR element and examine the value of
    the cells length attribute which should be set to six.  
    Check the value of the last TD element.  Invoke the
    insertCell() which will append the empty cell to the end of the list.
    Check the value of the newly created cell and make sure it is null
    and also the numbers of cells should now be seven.

* @author NIST
* @author Rick Rivello
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-html#ID-68927016
*/
function HTMLTableRowElement12() {
   var success;
    if(checkInitialization(builder, "HTMLTableRowElement12") != null) return;
    var nodeList;
      var cellsnodeList;
      var testNode;
      var trNode;
      var cellNode;
      var value;
      var newCell;
      var vcells;
      var doc;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "tablerow");
      nodeList = doc.getElementsByTagName("tr");
      assertSize("Asize",5,nodeList);
testNode = nodeList.item(3);
      cellsnodeList = testNode.cells;

      vcells = cellsnodeList.length;

      assertEquals("cellsLink1",6,vcells);
       trNode = cellsnodeList.item(5);
      cellNode = trNode.firstChild;

      value = cellNode.nodeValue;

      assertEquals("value1Link","1230 North Ave. Dallas, Texas 98551",value);
       newCell = testNode.insertCell(6);
      testNode = nodeList.item(3);
      cellsnodeList = testNode.cells;

      vcells = cellsnodeList.length;

      assertEquals("cellsLink2",7,vcells);
       trNode = cellsnodeList.item(6);
      cellNode = trNode.firstChild;

      assertNull("value2Link",cellNode);
    
}




function runTest() {
   HTMLTableRowElement12();
}
