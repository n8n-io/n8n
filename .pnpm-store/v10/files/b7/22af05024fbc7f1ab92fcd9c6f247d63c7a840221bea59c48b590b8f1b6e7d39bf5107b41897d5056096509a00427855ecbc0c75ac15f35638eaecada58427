
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
      return "http://www.w3.org/2001/DOM-Test-Suite/level1/core/hc_elementgetelementsbytagnamespecialvalue";
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
The "getElementsByTagName(name)" method may use the
special value "*" to match all tags in the element
tree.

Create a NodeList of all the descendant elements
of the last employee by using the special value "*".
The method should return all the descendant children(6)
in the order the children were encountered.

* @author Curt Arnold
* @see http://www.w3.org/TR/1998/REC-DOM-Level-1-19981001/level-one-core#ID-1938918D
*/
function hc_elementgetelementsbytagnamespecialvalue() {
   var success;
    if(checkInitialization(builder, "hc_elementgetelementsbytagnamespecialvalue") != null) return;
    var doc;
      var elementList;
      var lastEmployee;
      var lastempList;
      var child;
      var childName;
      var result = new Array();

      expectedResult = new Array();
      expectedResult[0] = "em";
      expectedResult[1] = "strong";
      expectedResult[2] = "code";
      expectedResult[3] = "sup";
      expectedResult[4] = "var";
      expectedResult[5] = "acronym";

      
      var docRef = null;
      if (typeof(this.doc) != 'undefined') {
        docRef = this.doc;
      }
      doc = load(docRef, "doc", "hc_staff");
      elementList = doc.getElementsByTagName("p");
      lastEmployee = elementList.item(4);
      lastempList = lastEmployee.getElementsByTagName("*");
      for(var indexN10067 = 0;indexN10067 < lastempList.length; indexN10067++) {
      child = lastempList.item(indexN10067);
      childName = child.nodeName;

      result[result.length] = childName;

	}
   assertEqualsListAutoCase("element", "tagNames",expectedResult,result);
       
}




function runTest() {
   hc_elementgetelementsbytagnamespecialvalue();
}
