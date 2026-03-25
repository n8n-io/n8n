
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_elementcreatenewattribute";
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
    The "setAttributeNode(newAttr)" method adds a new 
   attribute to the Element.  
   
   Retrieve first address element and add
   a new attribute node to it by invoking its         
   "setAttributeNode(newAttr)" method.  This test makes use
   of the "createAttribute(name)" method from the Document
   interface.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-887236154
* @see http://www.w3.org/Bugs/Public/show_bug.cgi?id=243
*/
function hc_elementcreatenewattribute() {
   var success;
    if(checkInitialization(builder, "hc_elementcreatenewattribute") != null) return;
    var doc;
      var elementList;
      var testAddress;
      var newAttribute;
      var oldAttr;
      var districtAttr;
      var attrVal;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("acronym");
      testAddress = elementList.item(0);
      newAttribute = doc.createAttribute("lang");
      oldAttr = testAddress.setAttributeNode(newAttribute);
      assertNull("old_attr_doesnt_exist",oldAttr);
    districtAttr = testAddress.getAttributeNode("lang");
      assertNotNull("new_district_accessible",districtAttr);
attrVal = testAddress.getAttribute("lang");
      assertEquals("attr_value","",attrVal);
       
}




function runTest() {
   hc_elementcreatenewattribute();
}
