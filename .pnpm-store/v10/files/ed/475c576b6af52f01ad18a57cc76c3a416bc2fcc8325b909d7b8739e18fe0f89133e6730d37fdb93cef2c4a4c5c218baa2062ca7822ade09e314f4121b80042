
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_attrreplacechild2";
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
Replaces a text node of an attribute with a document fragment and checks if the value of
the attribute is changed.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-637646024
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-785887307
*/
function hc_attrreplacechild2() {
   var success;
    if(checkInitialization(builder, "hc_attrreplacechild2") != null) return;
    var doc;
      var acronymList;
      var testNode;
      var attributes;
      var titleAttr;
      var value;
      var terNode;
      var dayNode;
      var docFrag;
      var retval;
      var firstChild;
      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      acronymList = doc.getElementsByTagName("acronym");
      testNode = acronymList.item(3);
      attributes = testNode.attributes;

      titleAttr = attributes.getNamedItem("title");
      terNode = doc.createTextNode("ter");
      dayNode = doc.createTextNode("day");
      docFrag = doc.createDocumentFragment();
      retval = docFrag.appendChild(terNode);
      retval = docFrag.appendChild(dayNode);
      firstChild = titleAttr.firstChild;

      assertNotNull("attrChildNotNull",firstChild);
retval = titleAttr.replaceChild(docFrag,firstChild);
      value = titleAttr.value;

      assertEquals("attrValue","terday",value);
       value = titleAttr.nodeValue;

      assertEquals("attrNodeValue","terday",value);
       value = retval.nodeValue;

      assertEquals("retvalValue","Yes",value);
       firstChild = titleAttr.firstChild;

      value = firstChild.nodeValue;

      assertEquals("firstChildValue","ter",value);
       
}




function runTest() {
   hc_attrreplacechild2();
}
