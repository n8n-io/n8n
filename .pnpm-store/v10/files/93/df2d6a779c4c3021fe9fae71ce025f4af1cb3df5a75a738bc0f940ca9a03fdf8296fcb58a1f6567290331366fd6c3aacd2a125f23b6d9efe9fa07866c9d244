
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_documentgetelementsbytagnamevalue";
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
    The "getElementsByTagName(tagName)" method returns a 
   NodeList of all the Elements with a given tagName
   in a pre-order traversal of the tree.
   
   Retrieve the entire DOM document and invoke its 
   "getElementsByTagName(tagName)" method with tagName
   equal to "strong".  The method should return a NodeList 
   that contains 5 elements.  The FOURTH item in the
   list is retrieved and output.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-A6C9094
*/
function hc_documentgetelementsbytagnamevalue() {
   var success;
    if(checkInitialization(builder, "hc_documentgetelementsbytagnamevalue") != null) return;
    var doc;
      var nameList;
      var nameNode;
      var firstChild;
      var childValue;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      nameList = doc.getElementsByTagName("strong");
      nameNode = nameList.item(3);
      firstChild = nameNode.firstChild;

      childValue = firstChild.nodeValue;

      assertEquals("documentGetElementsByTagNameValueAssert","Jeny Oconnor",childValue);
       
}




function runTest() {
   hc_documentgetelementsbytagnamevalue();
}
