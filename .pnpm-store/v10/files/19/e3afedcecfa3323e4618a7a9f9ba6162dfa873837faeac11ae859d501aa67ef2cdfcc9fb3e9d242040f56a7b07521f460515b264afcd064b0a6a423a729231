
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodecommentnodetype";
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
    The "getNodeType()" method for a Comment Node
    returns the constant value 8.
    
    Retrieve the nodes from the document and check for
    a comment node and invoke the "getNodeType()" method.   This should   
    return 8. 

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-111237558
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-1728279322
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=248
*/
function hc_nodecommentnodetype() {
   var success;
    if(checkInitialization(builder, "hc_nodecommentnodetype") != null) return;
    var doc;
      var testList;
      var commentNode;
      var commentNodeName;
      var nodeType;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      testList = doc.childNodes;

      for(var indexN10040 = 0;indexN10040 < testList.length; indexN10040++) {
      commentNode = testList.item(indexN10040);
      commentNodeName = commentNode.nodeName;

      
	if(
	("#comment" == commentNodeName)
	) {
	nodeType = commentNode.nodeType;

      assertEquals("existingCommentNodeType",8,nodeType);
       
	}
	
	}
   commentNode = doc.createComment("This is a comment");
      nodeType = commentNode.nodeType;

      assertEquals("createdCommentNodeType",8,nodeType);
       
}




function runTest() {
   hc_nodecommentnodetype();
}
