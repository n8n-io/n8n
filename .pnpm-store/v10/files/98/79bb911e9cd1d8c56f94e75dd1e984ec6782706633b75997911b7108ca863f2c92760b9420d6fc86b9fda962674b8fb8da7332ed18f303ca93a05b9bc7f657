
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_nodereplacechildnodename";
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
    The "replaceChild(newChild,oldChild)" method returns 
    the node being replaced.
    
    Replace the second Element of the second employee with
    a newly created node Element and check the NodeName 
    returned by the "replaceChild(newChild,oldChild)"
    method.   The returned node should have a NodeName equal
    to "em".

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-F68D095
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-785887307
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=247
*/
function hc_nodereplacechildnodename() {
   var success;
    if(checkInitialization(builder, "hc_nodereplacechildnodename") != null) return;
    var doc;
      var elementList;
      var employeeNode;
      var childList;
      var oldChild;
      var newChild;
      var replacedNode;
      var childName;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("p");
      employeeNode = elementList.item(1);
      childList = employeeNode.getElementsByTagName("em");
      oldChild = childList.item(0);
      newChild = doc.createElement("br");
      replacedNode = employeeNode.replaceChild(newChild,oldChild);
      childName = replacedNode.nodeName;

      assertEqualsAutoCase("element", "replacedNodeName","em",childName);
       
}




function runTest() {
   hc_nodereplacechildnodename();
}
