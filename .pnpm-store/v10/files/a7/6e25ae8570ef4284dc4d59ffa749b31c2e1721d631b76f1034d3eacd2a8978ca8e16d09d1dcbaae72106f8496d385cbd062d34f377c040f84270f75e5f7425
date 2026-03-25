
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodeclonenodetrue";
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
    The "cloneNode(deep)" method returns a copy of the node
    and the subtree under it if deep=true.
    
    Retrieve the second employee and invoke the
    "cloneNode(deep)" method with deep=true.   The
    method should clone this node and the subtree under it.
    The NodeName of each child in the returned node is 
    checked to insure the entire subtree under the second
    employee was cloned.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-3A0ED0A4
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=246
*/
function hc_nodeclonenodetrue() {
   var success;
    if(checkInitialization(builder, "hc_nodeclonenodetrue") != null) return;
    var doc;
      var elementList;
      var employeeNode;
      var clonedNode;
      var clonedList;
      var clonedChild;
      var clonedChildName;
      var origList;
      var origChild;
      var origChildName;
      var result = new Array();

      var expected = new Array();

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("p");
      employeeNode = elementList.item(1);
      origList = employeeNode.childNodes;

      for(var indexN10065 = 0;indexN10065 < origList.length; indexN10065++) {
      origChild = origList.item(indexN10065);
      origChildName = origChild.nodeName;

      expected[expected.length] = origChildName;

	}
   clonedNode = employeeNode.cloneNode(true);
      clonedList = clonedNode.childNodes;

      for(var indexN1007B = 0;indexN1007B < clonedList.length; indexN1007B++) {
      clonedChild = clonedList.item(indexN1007B);
      clonedChildName = clonedChild.nodeName;

      result[result.length] = clonedChildName;

	}
   assertEqualsList("clone",expected,result);
       
}




function runTest() {
   hc_nodeclonenodetrue();
}
