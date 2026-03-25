
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_elementgetelementempty";
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
    The "getAttribute(name)" method returns an empty 
   string if no value was assigned to an attribute and 
   no default value was given in the DTD file.
   
   Retrieve the last child of the last employee, then
   invoke "getAttribute(name)" method, where "strong" is an
   attribute without a specified or DTD default value. 
   The "getAttribute(name)" method should return the empty
   string.  This method makes use of the
   "createAttribute(newAttr)" method from the Document
   interface.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-666EE0F9
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=243
*/
function hc_elementgetelementempty() {
   var success;
    if(checkInitialization(builder, "hc_elementgetelementempty") != null) return;
    var doc;
      var newAttribute;
      var elementList;
      var testEmployee;
      var domesticAttr;
      var attrValue;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      newAttribute = doc.createAttribute("lang");
      elementList = doc.getElementsByTagName("acronym");
      testEmployee = elementList.item(3);
      domesticAttr = testEmployee.setAttributeNode(newAttribute);
      attrValue = testEmployee.getAttribute("lang");
      assertEquals("elementGetElementEmptyAssert","",attrValue);
       
}




function runTest() {
   hc_elementgetelementempty();
}
