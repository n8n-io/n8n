
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_documentcreatedocumentfragment";
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
    The "createDocumentFragment()" method creates an empty 
   DocumentFragment object.
   Retrieve the entire DOM document and invoke its 
   "createDocumentFragment()" method.  The content, name, 
   type and value of the newly created object are output.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-35CB04B5
*/
function hc_documentcreatedocumentfragment() {
   var success;
    if(checkInitialization(builder, "hc_documentcreatedocumentfragment") != null) return;
    var doc;
      var newDocFragment;
      var children;
      var length;
      var newDocFragmentName;
      var newDocFragmentType;
      var newDocFragmentValue;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      newDocFragment = doc.createDocumentFragment();
      children = newDocFragment.childNodes;

      length = children.length;

      assertEquals("length",0,length);
       newDocFragmentName = newDocFragment.nodeName;

      assertEquals("strong","#document-fragment",newDocFragmentName);
       newDocFragmentType = newDocFragment.nodeType;

      assertEquals("type",11,newDocFragmentType);
       newDocFragmentValue = newDocFragment.nodeValue;

      assertNull("value",newDocFragmentValue);
    
}




function runTest() {
   hc_documentcreatedocumentfragment();
}
