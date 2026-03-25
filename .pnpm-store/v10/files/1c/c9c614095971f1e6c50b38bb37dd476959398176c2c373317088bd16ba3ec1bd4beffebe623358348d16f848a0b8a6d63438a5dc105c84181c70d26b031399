
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodeinsertbefore";
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
    The "insertBefore(newChild,refChild)" method inserts the
    node "newChild" before the node "refChild". 
    
    Insert a newly created Element node before the second
    sup element in the document and check the "newChild"
    and "refChild" after insertion for correct placement.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-952280727
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=246
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=247
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=261
*/
function hc_nodeinsertbefore() {
   var success;
    if(checkInitialization(builder, "hc_nodeinsertbefore") != null) return;
    var doc;
      var elementList;
      var employeeNode;
      var childList;
      var refChild;
      var newChild;
      var child;
      var childName;
      var insertedNode;
      var actual = new Array();

      expected = new Array();
      expected[0] = "em";
      expected[1] = "strong";
      expected[2] = "code";
      expected[3] = "br";
      expected[4] = "sup";
      expected[5] = "var";
      expected[6] = "acronym";

      var nodeType;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("sup");
      refChild = elementList.item(2);
      employeeNode = refChild.parentNode;

      childList = employeeNode.childNodes;

      newChild = doc.createElement("br");
      insertedNode = employeeNode.insertBefore(newChild,refChild);
      for(var indexN10091 = 0;indexN10091 < childList.length; indexN10091++) {
      child = childList.item(indexN10091);
      nodeType = child.nodeType;

      
	if(
	(1 == nodeType)
	) {
	childName = child.nodeName;

      actual[actual.length] = childName;

	}
	
	}
   assertEqualsListAutoCase("element", "nodeNames",expected,actual);
       
}




function runTest() {
   hc_nodeinsertbefore();
}
