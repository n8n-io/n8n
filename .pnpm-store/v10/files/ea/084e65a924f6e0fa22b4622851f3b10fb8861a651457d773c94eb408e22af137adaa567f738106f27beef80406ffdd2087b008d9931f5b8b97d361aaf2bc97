
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_noderemovechildnode";
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
      docsLoaded += preload(docRef, "doc", "hc_staff");
        
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
    The "removeChild(oldChild)" method removes the node
    indicated by "oldChild". 
    
    Retrieve the second p element and remove its first child.
    After the removal, the second p element should have 5 element
    children and the first child should now be the child
    that used to be at the second position in the list.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-1734834066
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=246
*/
function hc_noderemovechildnode() {
   var success;
    if(checkInitialization(builder, "hc_noderemovechildnode") != null) return;
    var doc;
      var elementList;
      var emList;
      var employeeNode;
      var childList;
      var oldChild;
      var child;
      var childName;
      var length;
      var removedChild;
      var removedName;
      var nodeType;
      expected = new Array();
      expected[0] = "strong";
      expected[1] = "code";
      expected[2] = "sup";
      expected[3] = "var";
      expected[4] = "acronym";

      var actual = new Array();

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("p");
      employeeNode = elementList.item(1);
      childList = employeeNode.childNodes;

      emList = employeeNode.getElementsByTagName("em");
      oldChild = emList.item(0);
      removedChild = employeeNode.removeChild(oldChild);
      removedName = removedChild.nodeName;

      assertEqualsAutoCase("element", "removedName","em",removedName);
       for(var indexN10098 = 0;indexN10098 < childList.length; indexN10098++) {
      child = childList.item(indexN10098);
      nodeType = child.nodeType;

      childName = child.nodeName;

      
	if(
	(1 == nodeType)
	) {
	actual[actual.length] = childName;

	}
	
		else {
			assertEquals("textNodeType",3,nodeType);
       assertEquals("textNodeName","#text",childName);
       
		}
	
	}
   assertEqualsListAutoCase("element", "childNames",expected,actual);
       
}




function runTest() {
   hc_noderemovechildnode();
}
